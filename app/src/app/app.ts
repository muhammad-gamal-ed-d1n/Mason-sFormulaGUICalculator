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
    {from: "A", to: "B", gain: 4},
    {from: "A", to: "D", gain: 4},
    {from: "B", to: "C", gain: 4},
    {from: "B", to: "D", gain: 4},
    {from: "D", to: "A", gain: 4},
    {from: "D", to: "C", gain: 4},
  ]

  // A -> B -> C
  // |    |    |
  // --<--D -->--
  ngOnInit() {
    let paths = this.sfservice.helper(this.edges)
    console.log(paths)
    let loops = this.sfservice.findLoops(this.edges)
    console.log(loops)
  }

}
