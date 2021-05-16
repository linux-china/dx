import {createHash} from "https://deno.land/std@0.96.0/hash/mod.ts";

/**
 * digest data with algorithm and return has in hex
 * @param data
 * @param algorithm
 * @return hash in hex
 */
export function digest(data: string | ArrayBuffer, algorithm?: 'md5' | 'sha256' | 'sha512' = "md5"): string {
    const hash = createHash(algorithm);
    hash.update(data);
    return hash.toString();
}
