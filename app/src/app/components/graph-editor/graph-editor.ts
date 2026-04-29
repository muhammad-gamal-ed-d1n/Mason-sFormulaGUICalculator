import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import { every } from 'rxjs';
import { SignalFlowService } from '../../services/signal.flow.service';
import { Edge } from '../../model/edge';
import { Pipe,PipeTransform } from '@angular/core';
import katex from 'katex';

cytoscape.use(edgehandles);

interface Result{
  transferFunction: number,
  numerator: number,
  delta : number,
  forwardPaths : string[],
  allLoops : string[],
  loopGains:  Map<String,number>,
  touchGroups: Map<string, string[][]>,
  formulaLatex: string
}
@Component({
  selector: 'app-graph-editor',
  templateUrl: './graph-editor.html',
  styleUrl: './graph-editor.css',
  imports: []
})
export class GraphEditorComponent implements AfterViewInit {
  @ViewChild('canvas') canvasElement!:ElementRef;
  nodeCnt=0;
  drawing=true;
  lightmode=false;
  jpg64: string='';
  cy!: cytoscape.Core;
  undohistory: any[] = [];
  redohistory :any[] = [];
  selected_nodes : any[] =[];
  solver = inject(SignalFlowService);
  sanitizer = inject(DomSanitizer);
  forward_paths:string[] = [];
  all_loops : string[] = [];
  transferFunction!: string;
  delta!: number;
  loopGains!: Map<String,number>;
  touchGroups!: Map<string, string[][]>;
  formulaLatex!: string;
  formulaLatexHtml!: SafeHtml;
  
  touchGroupKeys(): string[] {
    return this.touchGroups ? Array.from(this.touchGroups.keys()) : [];
  }

  highlight: string= 'None';
  cdrf  = inject(ChangeDetectorRef);
  pulseAnumation:any;
  ngAfterViewInit(): void {
    
    const cy=cytoscape({
      container:this.canvasElement.nativeElement,
      elements:[],
      style:[
        {
          selector:'node',
          style: {
            'background-color': '#6495ED',
            'label': 'data(id)',
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center'
          }
        },
        {
          selector:'node:selected',
          style: {
            'background-color': '#004fe3',
            'label': 'data(id)',
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center'
          }
        }
        ,
        {
        selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#ffffff',
            'target-arrow-color': '#ffffff',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'control-point-step-size': 40,
    
            'label': 'data(weight)',
            'color': '#ffffff',
            'text-margin-y': -8,
            'text-rotation': 'autorotate',
            'font-size': '8px',
            'z-index':1
          }
        },
        {
          selector: '.eh-handle',
          style: {
            'background-color': 'red',
            'width': 3,
            'height': 3,
            'shape': 'ellipse',
            'border-width': 10,
            'border-opacity': 0,
            'label': '',
            
          }
        },
        {
          selector: '.eh-preview, .eh-ghost-edge',
          style: {
            'background-color': 'red',
            'line-color': 'red',
            'target-arrow-color': 'red',
            'source-arrow-color': 'red'
          }
        },
        {
          selector:'edge.straight',
          style:{
            'curve-style': 'straight'
          }
        },
        {
          selector:'edge.curved',
          style:{
            'curve-style': 'unbundled-bezier',
            'control-point-weights': 0.5
          }
        },
        // {
        //   selector: 'edge.long-jump',
        //   style: {
        //     'curve-style':'unbundled-bezier',
        //       'control-point-step-size': 100, // Make long jumps bow higher
        //       'control-point-distances':(edge:any)=>{
        //         const s = edge.source().position();
        //         const e = edge.target().position();
        //         const dist = Math.sqrt(Math.pow((e.x-s.x),2)+Math.sqrt(Math.pow((e.y - s.y),2)));
        //         return s.x < e.x ? [dist/3] : [-dist/3];
        //       }, 
        //       "control-point-weights" : [0.5]
        //     }
        // },
        {
          selector: '.highlighted',
          style: {
              "line-color" : "#00f2fe",
              "target-arrow-color": "#00f2fe",
              'width' : 3,
              "z-index":999
            }
        },
        {
          selector: '.signal-path',
          style: {
              "line-color" : "#00f2fe",
              "target-arrow-color": "#00f2fe",
              'width' : 3,
              "line-style":'dashed',
              "line-dash-pattern":[14,10],
              "z-index":999
            }
        }
        // {
        //   selector : 'eh-source',
        //   style : {
        //     "border-width": 2,
        //     "border-color" : 'red'
        //   }
        // }
      ]
      ,maxZoom: 15,
      minZoom : 0.1
    })
    this.cy=cy;
    this.undohistory = [cy.json()]
    this.setup(cy);
  }
  setup(cy:cytoscape.Core){

    // function to fit all elements in the canvas with dynamic animation based on node count
    const fitAllAnimation=()=>{
      cy.animate({
        fit:{ eles:cy.elements(), padding:Math.max(50,300-this.nodeCnt*30) } 
      },{ duration: 300 });
    }

    // Add node when tap on the background
    cy.on('tap', (event => {
      if (event.target==cy && this.drawing) {
        this.nodeCnt++;
        cy.add({
          group: 'nodes',
          data:{id:`Y${this.nodeCnt}` },
          position:{x:event.position.x, y:event.position.y}
        });
        
        // After adding a node fit all elements in the canvas with animation
        
        fitAllAnimation();
        this.addState();
      }
    }));

    // Remove node or edge when tap on it while not in drawing mode
    cy.on('tap', 'node', (event)=>{
      if (!this.drawing) {
        cy.remove(event.target);
        this.addState();
      }
      else{
      if(this.selected_nodes.length == 2){
        this.selected_nodes[0] = this.selected_nodes[1];
        this.selected_nodes[1] = event.target.id();
      }else{
      this.selected_nodes.push(event.target.id());
      }
    }
    });

    cy.on('select','node',(event)=>{
      if(this.drawing){
      const selected = cy.nodes(':selected')

      if(selected.length > 2){
        selected.first().unselect();
      }
      
        for(let items of this.selected_nodes){
          cy.$(`#${items}`).select()
        }
      }
    })

    cy.on('click','edge',(event)=>{
      const weightInput=window.prompt("Enter edge's weight: ","1");

      if (weightInput===null || weightInput.trim()==='') {
        return;
      }
      const weight=parseFloat(weightInput || '');

      if(isNaN(weight)){
        alert("Invalid weight");
      }else{
        console.log(event.target.data())
        event.target.data('weight',weight);
      }
      this.addState();
    })
    // Remove edge when tap on it while not in drawing mode
    cy.on('tap', 'edge', (event)=>{
      if (!this.drawing) {
        cy.remove(event.target);
        this.addState();
      }
    });

    // initialize edgehandles with custom options
    (cy as any).edgehandles({
      snap:true,
      handleNodes:'node',
      noEdgeEventsInDraw: false,
      drawMode: false,
      loopAllowed:()=>true,

      // take the weight of the edge as an input while adding the edge
      complete:(source:cytoscape.NodeSingular,target:cytoscape.NodeSingular,addedEdge:cytoscape.EdgeCollection)=>{
        const weightInput=window.prompt("Enter edge's weight: ","1");
        if (weightInput===null || weightInput.trim()==='') {
          cy.remove(addedEdge);
          return;
        }
        const weight=parseFloat(weightInput || '');

        if(isNaN(weight)){
          cy.remove(addedEdge);
          alert("Invalid weight");
        }else{
          const existingEdge=cy.edges(`[source="${source.id()}"][target="${target.id()}"]`).not(addedEdge);
          if(existingEdge.length>0){
            const oldWeight=parseFloat(existingEdge.first().data('weight'));
            existingEdge.first().data('weight', oldWeight+weight);
            cy.remove(addedEdge);
          }else {
            const sPos=source.position();
            const ePos=target.position();
            const dist=Math.sqrt(Math.pow((ePos.x-sPos.x),2)+Math.sqrt(Math.pow((ePos.y-sPos.y),2)));
            if(source.id()==target.id()){
              addedEdge.style({
                'loop-direction':'-45deg',
                'loop-sweep':'90deg',
                'control-point-step-size':40
              })
            }
            else if(dist>150){
              addedEdge.addClass('long-jump');
            }
            addedEdge.data('weight',weight);
          }

          const remove_extra_added = cy.filter((element)=>{
            return element.id()[0]!='Y' && element.isNode()&& element.id().length > 5 ;
          })
          console.log(remove_extra_added);
          for(let items of remove_extra_added){
          cy.remove(`#${items.id()}`);
          }
          this.addState();
        }
      },
    });
  }

  addState(){
    this.undohistory.push(this.cy.json());
  }
  undoState(){
    if(this.undohistory.length < 2) return;
   
    const currentState = this.undohistory.pop();

    if(currentState){
      this.redohistory.push(currentState);
    }

    const previous_state : any = this.undohistory[this.undohistory.length-1];

    console.log((previous_state))
    if(previous_state){
      this.cy.json((previous_state))
    }  
  }
  redoState(){
    
    console.log(this.redohistory)

    if(this.redohistory.length == 0) return;

    const previous_state : any = this.redohistory.pop();

    this.undohistory.push(previous_state)

    if(previous_state){
      this.cy.json((previous_state))
    
    }
  }
  // refresh(){
  //   this.cy.layout({name:'cose',animate:true}).run()
  // }
  // function to take snapshot from the canvas and save it 
  takeSnapshotimage(){
    if(this.cy){
      this.jpg64=this.cy.jpg({ bg: this.lightmode?'#ffffff':'#000000' });
      console.log(this.cy.edges().jsons())
    }
  }
  
  downloadImage(){
    if(this.jpg64){
      const link=document.createElement('a');
      link.href=this.jpg64;
      link.download='sfg_snapshot.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  toggleLightMode(){
    this.lightmode=!this.lightmode;
    const newColor = this.lightmode ? '#000000' : '#ffffff';
    this.cy.style().selector('edge').style({
      'line-color': newColor,
      'target-arrow-color': newColor,
      'color': newColor
    }).selector('node').style({
      'color': newColor
    }).selector('node:selected').style({
      'color': newColor
    }).update();
  }

  solve(){
    if(!(this.selected_nodes[0] && this.selected_nodes[1])){
      if(this.selected_nodes[0] == this.selected_nodes[1])
        alert("Cant make the source and the target the same nodes!");
      return;
    }
    const idcollection = this.cy.edges().map(edge=>({ 
      from: edge.source().id(),
      to: edge.target().id(),
      gain: edge.data('weight')
    } as Edge
    ))
    console.log(idcollection);
    if(this.selected_nodes.length == 2){
      const result:Result =  this.solver.calculateMasonsFormula(idcollection, this.selected_nodes[0], this.selected_nodes[1]);
      console.log(result);
      this.all_loops = result.allLoops;
      this.forward_paths = result.forwardPaths;
      this.delta = result.delta
      this.transferFunction = result.transferFunction.toPrecision(6);
      this.transferFunction = this.transferFunction;
      this.loopGains = result.loopGains;
      this.touchGroups = result.touchGroups;
      this.formulaLatex = result.formulaLatex;
      this.formulaLatexHtml = this.sanitizer.bypassSecurityTrustHtml(
        katex.renderToString(result.formulaLatex, { displayMode: true })
      );
      console.log(this.touchGroups)
    }else{
      window.alert('Choose the source and target')
    }

  }
    f_highlight(Loop:string){
      this.highlight = (this.highlight === Loop) ? '' : Loop;
      console.log(this.highlight == Loop);      
      if(this.highlight ==''){
      this.cy.edges().removeClass('highlighted');
      this.cy.edges().removeClass('signal-path');
      return;
      }
      this.cy.edges().removeClass('highlighted');
      this.cy.edges().removeClass('signal-path');

      let nodes:string[]=[];
      if(Loop.includes('->')) nodes= Loop.split('->').map(x => x.trim());
      else{
        nodes= Loop.split('-').map(x => x.trim());
        nodes.push(nodes[0]);

      }
      for(let i=0;i<nodes.length-1;i++){
        const source = nodes[i];
        const target = nodes[i+1];

        const edge = this.cy.edges(
          `[source="${source}"][target="${target}"]`
        )
        
        edge.addClass('highlighted');
      }


      this.animatePath()
      this.cdrf.detectChanges();
    }
    animatePath(){
      const edges = this.cy.edges('.highlighted');
      if(this.pulseAnumation)
        clearInterval(this.pulseAnumation);

      edges.addClass('signal-path');
      let offset = 0;

      this.pulseAnumation = setInterval(()=>{
        offset++;
        edges.style(
          'line-dash-offset',
          offset*-1
        );
      },60)
    }
}
