import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SignalFlowService {
  
  public findPaths(arr: Map<string, string[]>, visited: Set<string>, paths: string[], path: string, node: string) {
    if (visited.has(node)) return;

    visited.add(node)
    path += node
    
    if (node == "C") {
      console.log(path)
      paths.push(node)
    }

    for (let n of arr.get(node)!) {
      this.findPaths(arr, new Set(visited), paths, path, n)
    }
  }

  public helper(graph: Map<string, string[]>) {
    this.findPaths(graph, new Set(), [], "", "A")
  }

}
