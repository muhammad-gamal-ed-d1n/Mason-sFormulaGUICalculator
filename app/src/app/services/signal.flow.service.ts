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

    return paths
  }

  public helper(graph: Map<string, string[]>) {
    this.findPaths(graph, new Set(), [], "", "A")
  }

  public findLoops(graph: Map<string, string[]>) {
    const visited = new Set<string>()
    const loops: Set<string> = new Set<string>()

    for (let node of graph.keys()) {
      this.findLoopsAtPoint(graph, node, new Set(visited), loops, "", node)
    }

    console.log(loops);
    
  }

  public findLoopsAtPoint(graph: Map<string, string[]>, start: string, visited: Set<string>, loops: Set<string>, loop: string, node: string) {
    if (visited.has(node) && node != start) return;

    visited.add(node)
    loop += node
    if (node == start && loop.length > 1) {
      loops.add(this.getCanonicalLoop(loop))
      return
    }

    for (let l of graph.get(node)!) [
      this.findLoopsAtPoint(graph, start, new Set(visited), loops, loop, l)
    ]
  }

  private getCanonicalLoop(loop: string) {
    loop = loop.slice(0, loop.length - 1)

    let min = 0
    for (let i = 0; i < loop.length; i++) {
      if (loop[i] < loop[min]) min = i;
    }

    let canonicalLoop = [...loop.slice(min), ...loop.slice(0, min)]

    return canonicalLoop.join('-')
  }

}
