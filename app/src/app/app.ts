import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignalFlowService } from './services/signal.flow.service';
import { Edge } from './model/edge';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('app');


  constructor(private sfservice: SignalFlowService) {}

  // graph: Map<string, string[]> = new Map([
  //   ["A", ["B"]],
  //   ["B", ["C", "D"]],
  //   ["D", ["A"]], 
  //   ["C", []]
  // ])      
  
edges: Edge[] = [
  { from: "A", to: "B", gain: 2 },
  { from: "B", to: "A", gain: 3 },

  { from: "C", to: "D", gain: 4 },
  { from: "D", to: "C", gain: 5 },

  { from: "E", to: "F", gain: 6 },
  { from: "F", to: "E", gain: 7 },

  { from: "B", to: "C", gain: 1 },
  { from: "D", to: "E", gain: 1 }
];

  // A -> B -> C
  // |    |    |
  // --<--D -->--
  ngOnInit() {
    let paths = this.sfservice.helper(this.edges, 'A', 'E')
    console.log(paths)
    let loops = this.sfservice.findLoops(this.edges)
    console.log(loops)

    console.log("groups");
    const groups = this.sfservice.getAllNonTouchingLoops(Array.from(loops))
    console.log(groups);
    
  }

}
