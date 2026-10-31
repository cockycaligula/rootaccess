import { solveLinearSystem } from './linalg.js';

/**
 * Ridge (L2-regularised) linear regression on standardised features.
 * Small, dependency-free and fully explainable: each prediction decomposes
 * into per-feature contributions (coef × z-score).
 */
export class RidgeRegression {
  mean: number[] = [];
  std: number[] = [];
  coef: number[] = [];
  intercept = 0;

  constructor(readonly lambda = 1) {}

  fit(X: number[][], y: number[]): this {
    const n = X.length;
    if (n === 0) throw new Error('Empty training set');
    const p = X[0].length;

    this.mean = new Array(p).fill(0);
    this.std = new Array(p).fill(0);
    for (const row of X) for (let j = 0; j < p; j++) this.mean[j] += row[j] / n;
    for (const row of X) for (let j = 0; j < p; j++) this.std[j] += (row[j] - this.mean[j]) ** 2 / n;
    this.std = this.std.map((v) => (v > 1e-12 ? Math.sqrt(v) : 1));

    this.intercept = y.reduce((a, b) => a + b, 0) / n;

    const XtX = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    const Xty = new Array<number>(p).fill(0);
    const z = new Array<number>(p);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) z[j] = (X[i][j] - this.mean[j]) / this.std[j];
      const yc = y[i] - this.intercept;
      for (let j = 0; j < p; j++) {
        Xty[j] += z[j] * yc;
        for (let k = j; k < p; k++) XtX[j][k] += z[j] * z[k];
      }
    }
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < j; k++) XtX[j][k] = XtX[k][j];
      XtX[j][j] += this.lambda;
    }
    this.coef = solveLinearSystem(XtX, Xty);
    return this;
  }

  contributions(x: number[]): number[] {
    return x.map((v, j) => this.coef[j] * ((v - this.mean[j]) / this.std[j]));
  }

  predict(x: number[]): number {
    return this.intercept + this.contributions(x).reduce((a, b) => a + b, 0);
  }
}
