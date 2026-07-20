import assert from "node:assert"
import { parseAlimentosResponse } from "../src/utils/parse-alimentos"

// (a) JSON puro
const a = parseAlimentosResponse('{"alimentos":[{"nome":"Arroz","quantidade":150,"unidade":"g","calorias":195,"proteinas":4,"carboidratos":42,"gorduras":0.5}]}')
assert.equal(a.length, 1)
assert.equal(a[0].nome, "Arroz")
assert.equal(a[0].calorias, 195)

// (b) JSON dentro de fence ```json
const b = parseAlimentosResponse('```json\n{"alimentos":[{"nome":"Ovo","quantidade":100,"unidade":"g","calorias":155,"proteinas":13,"carboidratos":1,"gorduras":11}]}\n```')
assert.equal(b.length, 1)
assert.equal(b[0].nome, "Ovo")

// (c) resposta sem alimentos -> []
const c = parseAlimentosResponse('{"foo":1}')
assert.deepEqual(c, [])

console.log("OK: parse-alimentos")
