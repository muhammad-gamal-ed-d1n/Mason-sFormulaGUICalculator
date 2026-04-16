import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import { every } from 'rxjs';
import { SignalFlowService } from '../../services/signal.flow.service';
import { Edge } from '../../model/edge';

cytoscape.use(edgehandles);
@Component({
  selector: 'app-graph-editor',
  templateUrl: './graph-editor.html',
  styleUrl: './graph-editor.css'
})
export class GraphEditorComponent implements AfterViewInit {
  @ViewChild('canvas') canvasElement!:ElementRef;
  nodeCnt=0;
  drawing=true;
  jpg64: string='';
  cy!: cytoscape.Core;
  undohistory: any[] = [];
  redohistory :any[] = [];
  selected_nodes : any[] =[];
  solver = inject(SignalFlowService);
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
            'control-point-step-size': 100,
    
            'label': 'data(weight)',
            'color': '#ffffff',
            'text-margin-y': -8,
            'text-rotation': 'autorotate',
            'font-size': '15px'
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
    cy.on('dblclick','node',(event)=>{
      cy.remove(event.target);
      this.addState();
    })

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

          // calculating the curvature of the edge based on the number of edges between the source and target nodes and the distance between them
          // to avoid edges overlapping each other
          const sourceId=source.id();
          const targetId=target.id();
          const sourceIdNum=Number(sourceId.substring(1));
          const targetIdNum=Number(targetId.substring(1));

          if(sourceId!==targetId){
            const edgesBetween=cy.edges(`[source="${sourceId}"][target="${targetId}"], [source="${targetId}"][target="${sourceId}"]`);
            if(edgesBetween.length==1 && (sourceIdNum==targetIdNum+1 || sourceIdNum==targetIdNum-1)){
              addedEdge.addClass('straight');
            }else{
              let start=Math.min(sourceIdNum,targetIdNum);
              let end=Math.max(sourceIdNum,targetIdNum);
              let jump=end-start;
              let MaxPath=0;
              while(start!=end){
                const edgesbetStrt=cy.edges(`[source="Y${start}"][target="Y${start+1}"], [source="Y${start+1}"][target="Y${start}"]`);
                MaxPath=Math.max(MaxPath,edgesbetStrt.length);
                start++;
              }
              addedEdge.addClass('curved');              
              let level=Math.floor(edgesBetween.length/2);
              let maxLevel=Math.floor(MaxPath/2);
              let curvature=30*maxLevel + 20*level + 100*(jump-1);
              if(edgesBetween.length%2 !== 0) {
                curvature=-curvature;
              }
              if(sourceIdNum>targetIdNum){
                curvature=-curvature;
              }
              addedEdge.style('control-point-distances',curvature);
            }
          }
          console.log(`Edge added from ${sourceId} to ${targetId} with weight ${weight}`);
          addedEdge.data('weight',weight);

          const remove_extra_added = cy.filter((element)=>{
            return element.id()[0]!='Y' && element.isNode()&& element.id().length > 5 ;
          })
          console.log(remove_extra_added);
          for(let items of remove_extra_added){
          cy.remove(`#${items.id()}`);
          }
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
      this.jpg64=this.cy.jpg({bg:'#000000'});
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


  solve(){
    const idcollection = this.cy.edges().map(edge=>({ 
      from: edge.source().id(),
      to: edge.target().id(),
      gain: edge.data('weight')
    } as Edge
    ))
    console.log(idcollection);
    if(this.selected_nodes.length == 2){
    console.log(this.solver.calculateMasonsFormula(idcollection, this.selected_nodes[0], this.selected_nodes[1]))
    }else{
      window.alert('Choose the source and target')
    }

  }
    
}
