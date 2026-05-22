

export class MathUtils {

    static sum(arr) {
        return arr.reduce((acc, val) => acc + val, 0);
    }

    static gridDistance(posA, posB) {
        return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
    }
}
