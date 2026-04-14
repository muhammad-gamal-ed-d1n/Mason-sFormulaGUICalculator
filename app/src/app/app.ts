import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignalFlowService } from './services/signal.flow.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('app');


  constructor(private sfservice: SignalFlowService) {}

  graph: Map<string, string[]> = new Map([
    ["A", ["B"]],
    ["B", ["C", "D"]],
    ["D", ["A"]], // A -> B -> C
    ["C", []]//           |    |
  ])          //          D ---

  ngOnInit() {
    // this.sfservice.helper(this.graph)
    this.sfservice.findLoops(this.graph)
  }

}
