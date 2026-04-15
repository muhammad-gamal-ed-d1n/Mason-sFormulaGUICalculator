import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';

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
  ngAfterViewInit(): void {
    const cy=cytoscape({
      container:this.canvasElement.nativeElement,
      elements:[],
      style:[
        {
          selector:'node',
          style: {
            'background-color': '#0074D9',
            'label': 'data(id)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center'
          }
        },
        {
        selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#000000',
            'target-arrow-color': '#000000',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'control-point-step-size': 100,
    
            'label': 'data(weight)',
            'text-margin-y': -15,
            'text-rotation': 'autorotate',
            'font-size': '14px'
          }
        },
        {
          selector: '.eh-handle',
          style: {
            'background-color': 'red',
            'width': 10,
            'height': 10,
            'shape': 'ellipse',
            'border-width': 10,
            'border-opacity': 0,
            'label': ''
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
        }
      ]
    })
    this.cy=cy;
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
      }
    }));

    // Remove node or edge when tap on it while not in drawing mode
    cy.on('tap', 'node', (event)=>{
      if (!this.drawing) {
        cy.remove(event.target);
      }
    });

    // Remove edge when tap on it while not in drawing mode
    cy.on('tap', 'edge', (event)=>{
      if (!this.drawing) {
        cy.remove(event.target);
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
      complete:(source:cytoscape.NodeCollection,target:cytoscape.NodeCollection,addedEdge:cytoscape.EdgeCollection)=>{
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
          addedEdge.data('weight',weight);
        }
      }
    });
  }

  // function to take snapshot from the canvas and save it 
  takeSnapshotimage(){
    if(this.cy){
      this.jpg64=this.cy.jpg();
    }
  }
  
}
