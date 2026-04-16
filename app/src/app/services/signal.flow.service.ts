import { Injectable } from '@angular/core';
import { Edge } from '../model/edge';

@Injectable({
  providedIn: 'root',
})
export class SignalFlowService {

  public findPaths(edges: Edge[], visited: Set<string>, paths: string[], pathNodes: string[], node: string, target: string) {
    if (visited.has(node)) return;

    visited.add(node)
    const nextPathNodes = [...pathNodes, node]

    if (node === target) {
      paths.push(nextPathNodes.join('->'))
      return;
    }

    for (let edge of edges) {
      if (edge.from == node) {
        this.findPaths(edges, new Set(visited), paths, nextPathNodes, edge.to, target)
      }
    }

    return paths
  }

  public helper(edges: Edge[], source: string, target: string) {
    return this.findPaths(edges, new Set(), [], [], source, target)
  }

  public findLoops(edges: Edge[]) {
    const visited = new Set<string>()
    const loops: Set<string> = new Set<string>()

    for (let edge of edges) {
      this.findLoopsAtPoint(edges, edge.from, new Set(visited), loops, [], edge.from)
    }

    return loops
  }

  public findLoopsAtPoint(edges: Edge[], start: string, visited: Set<string>, loops: Set<string>, loop: string[], node: string,) {
    if (visited.has(node) && node != start) return;

    visited.add(node)
    const nextLoop = [...loop, node]
    if (node == start && nextLoop.length > 1) {
      loops.add(this.getCanonicalLoop(nextLoop))
      return;
    }

    for (let edge of edges) {
      if (edge.from == node) {
        this.findLoopsAtPoint(edges, start, new Set(visited), loops, nextLoop, edge.to)
      }
    }
  }

  private getCanonicalLoop(loopNodes: string[]) {
    const loop = loopNodes.slice(0, loopNodes.length - 1)

    if (loop.length === 0) return '';

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

  //calculate the gain of path by multiplying the gains of its edges
  private calculatePathGain(path: string, edges: Edge[]): number {
    const nodes = path.split('->').filter(Boolean);
    let gain = 1;

    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      const edge = edges.find(e => e.from === from && e.to === to);

      if (!edge) return 0;
      gain *= edge.gain;
    }

    return gain;
  }

  //calculate the gain of a loop by multiplying the gains of its edges
  private calculateLoopGain(loop: string, edges: Edge[]): number {
    const nodes = loop.split('-').filter(Boolean);
    let gain = 1;

    for (let i = 0; i < nodes.length; i++) {
      const from = nodes[i];
      const to = nodes[(i + 1) % nodes.length];
      const edge = edges.find(e => e.from === from && e.to === to);

      if (!edge) return 0;
      gain *= edge.gain;
    }

    return gain;
  }
  
  //build a map of loop gains for all loops found for easier calculation of deltas
  private buildLoopGainsMap(loops: string[], edges: Edge[]): Map<string, number> {
    const loopGains = new Map<string, number>();

    for (const loop of loops) {
      loopGains.set(loop, this.calculateLoopGain(loop, edges));
    }

    return loopGains;
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

  //Delta i calculation (same as calulateDelta but for remaining edges and loops)
  public calculateDeltaForPath(path: string, edges: Edge[]): number {
    const pathNodes = new Set(path.split('->').filter(Boolean));

    //remove any branch touching the nodes on the forward path
    //remaining are the edges that don't contain the from or to nodes
    const remainingEdges = edges.filter(
      edge => !pathNodes.has(edge.from) && !pathNodes.has(edge.to)
    );

    const remainingLoops = Array.from(this.findLoops(remainingEdges));
    const remainingLoopGains = this.buildLoopGainsMap(remainingLoops, edges); 

    return this.calculateDelta(remainingLoops, remainingLoopGains);
  }

  //Mason's formula
  public calculateMasonsFormula(edges: Edge[], source: string, target: string) {
    const forwardPaths = this.helper(edges, source, target) || [];
    const allLoops = Array.from(this.findLoops(edges));
    const loopGains = this.buildLoopGainsMap(allLoops, edges);
    const delta = this.calculateDelta(allLoops, loopGains);

    let numerator = 0;
    for (const path of forwardPaths) {
      const pathGain = this.calculatePathGain(path, edges);
      const deltaI = this.calculateDeltaForPath(path, edges);
      numerator +=  pathGain * deltaI;
    }

    return {
      transferFunction: delta === 0 ? Infinity : numerator / delta,
      numerator,
      delta,
      forwardPaths,
      allLoops,
      loopGains,
    };
  }
}
