import { Injectable } from '@angular/core';
import { Edge } from '../model/edge';

@Injectable({
  providedIn: 'root',
})
export class SignalFlowService {

  public findPaths(edges: Edge[], visited: Set<string>, paths: string[], path: string, node: string) {
    if (visited.has(node)) return;

    visited.add(node)
    path += node

    if (node == "C") {
      paths.push(path)
    }

    for (let edge of edges) {
      if (edge.from == node) {
        this.findPaths(edges, new Set(visited), paths, path, edge.to)
      }
    }

    return paths
  }

  public helper(edges: Edge[]) {
    return this.findPaths(edges, new Set(), [], "", "A")
  }

  public findLoops(edges: Edge[]) {
    const visited = new Set<string>()
    const loops: Set<string> = new Set<string>()

    for (let edge of edges) {
      this.findLoopsAtPoint(edges, edge.from, new Set(visited), loops, "", edge.from)
    }

    return loops
  }

  public findLoopsAtPoint(edges: Edge[], start: string, visited: Set<string>, loops: Set<string>, loop: string, node: string) {
    if (visited.has(node) && node != start) return;

    visited.add(node)
    loop += node
    if (node == start && loop.length > 1) {
      loops.add(this.getCanonicalLoop(loop))
      return
    }

    for (let edge of edges) {
      if (edge.from == node) {
        this.findLoopsAtPoint(edges, start, new Set(visited), loops, loop, edge.to)
      }
    }
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
