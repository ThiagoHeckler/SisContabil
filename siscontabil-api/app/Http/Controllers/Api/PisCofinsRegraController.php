<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PisCofinsRegra;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PisCofinsRegraController extends Controller
{
    /** Normaliza para NCM de 8 dígitos (zeros à esquerda). */
    private function normalizeNcm8(?string $raw): string
    {
        $digits = preg_replace('/\D/', '', (string) $raw);
        if ($digits === '') return '';
        return substr(str_pad($digits, 8, '0', STR_PAD_LEFT), 0, 8);
    }

    private function toApi(PisCofinsRegra $r): array
    {
        return [
            'id'                  => $r->id,
            'ncm'                 => $r->ncm,
            'descricaoProduto'    => $r->descricao_produto,
            'codigoEnquadramento' => $r->codigo_enquadramento,
            'tabela'              => $r->tabela,
            'lei'                 => $r->lei,
        ];
    }

    /** GET /api/pis-cofins-regras?busca= */
    public function index(Request $request): JsonResponse
    {
        $query = PisCofinsRegra::query();

        if ($busca = trim((string) $request->input('busca'))) {
            $query->where(function ($q) use ($busca) {
                $q->where('ncm', 'like', "%{$busca}%")
                  ->orWhere('descricao_produto', 'like', "%{$busca}%")
                  ->orWhere('codigo_enquadramento', 'like', "%{$busca}%")
                  ->orWhere('tabela', 'like', "%{$busca}%");
            });
        }

        $regras = $query->orderBy('ncm')->get()->map(fn ($r) => $this->toApi($r));

        return response()->json($regras);
    }

    /** POST /api/pis-cofins-regras */
    public function store(Request $request): JsonResponse
    {
        $dados = $this->validar($request);
        $regra = PisCofinsRegra::create($dados);

        return response()->json($this->toApi($regra), 201);
    }

    /** PUT /api/pis-cofins-regras/{regra} */
    public function update(Request $request, PisCofinsRegra $pis_cofins_regra): JsonResponse
    {
        $dados = $this->validar($request);
        $pis_cofins_regra->update($dados);

        return response()->json($this->toApi($pis_cofins_regra));
    }

    /** DELETE /api/pis-cofins-regras/{regra} */
    public function destroy(PisCofinsRegra $pis_cofins_regra): JsonResponse
    {
        $pis_cofins_regra->delete();

        return response()->json(null, 204);
    }

    /** POST /api/pis-cofins-regras/importar — importação em lote dos dados locais. */
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'itens'                       => ['required', 'array'],
            'itens.*.ncm'                 => ['required'],
            'itens.*.codigoEnquadramento' => ['required'],
            'itens.*.tabela'              => ['required'],
            'itens.*.lei'                 => ['required'],
        ]);

        $importados = 0;
        foreach ($request->input('itens') as $item) {
            PisCofinsRegra::create([
                'ncm'                  => $this->normalizeNcm8($item['ncm'] ?? ''),
                'descricao_produto'    => $item['descricaoProduto'] ?? null,
                'codigo_enquadramento' => $item['codigoEnquadramento'],
                'tabela'               => $item['tabela'],
                'lei'                  => $item['lei'],
            ]);
            $importados++;
        }

        return response()->json(['importados' => $importados], 201);
    }

    private function validar(Request $request): array
    {
        $v = $request->validate([
            'ncm'                 => ['required', 'string'],
            'descricaoProduto'    => ['nullable', 'string'],
            'codigoEnquadramento' => ['required', 'string'],
            'tabela'              => ['required', 'string'],
            'lei'                 => ['required', 'string'],
        ]);

        return [
            'ncm'                  => $this->normalizeNcm8($v['ncm']),
            'descricao_produto'    => $v['descricaoProduto'] ?? null,
            'codigo_enquadramento' => $v['codigoEnquadramento'],
            'tabela'               => $v['tabela'],
            'lei'                  => $v['lei'],
        ];
    }
}
