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

  private areTouching(loopA: string, loopB: string): boolean {
    const nodesA = loopA.split('-');
    const nodesB = loopB.split('-');
    // any node in loop A exists in loop B?
    return nodesA.some(node => nodesB.includes(node));
  }

  /**
  * @param allLoops: the unique loops found by Mego's code
  * @param count: the number of non-touching loops we want to find (2, 3, ...)
  * @returns array of loop combinations (each combination is an array of loop strings)
  */
  public getNonTouchingGroups(allLoops: string[], count: number): string[][] {
    const results: string[][] = [];

    const findCombinations = (start: number, currentGroup: string[]) => {
        if (currentGroup.length === count) {
            results.push([...currentGroup]);
            return;
        }

        for (let i = start; i < allLoops.length; i++) {
            const nextLoop = allLoops[i];
            
            // check if nextLoop touches any loop already in our currentGroup
            const touchesExisting = currentGroup.some(l => this.areTouching(l, nextLoop));

            if (!touchesExisting) {
                currentGroup.push(nextLoop);
                findCombinations(i + 1, currentGroup);
                currentGroup.pop(); // backtrack
            }
        }
    };

    findCombinations(0, []);
    return results;
  }

  public calculateDelta(allLoops: string[], loopGains: Map<string, number>): number {
    let delta = 1;
    
    // 1.sum of individual loops
    let sumIndividual = 0;
    allLoops.forEach(l => sumIndividual += loopGains.get(l) || 0);
    delta -= sumIndividual;

    // 2.add/subtract combinations (2-non-touching, ...)
    for (let n = 2; n <= allLoops.length; n++) {
        const groups = this.getNonTouchingGroups(allLoops, n);
        if (groups.length === 0) break; // no more combinations possible

        let groupSum = 0;
        for (const group of groups) {
            // product of gains in this specific non-touching group
            let product = 1;
            group.forEach(loopStr => product *= (loopGains.get(loopStr) || 0));
            groupSum += product;
        }

        // alternating sign: + for 2-touching, - for 3-touching, etc.
        if (n % 2 === 0) delta += groupSum;
        else delta -= groupSum;
    }

    return delta;
  }
}
