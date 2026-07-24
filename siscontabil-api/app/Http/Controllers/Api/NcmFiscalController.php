<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NcmFiscal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NcmFiscalController extends Controller
{
    private function toApi(NcmFiscal $n): array
    {
        $out = [
            'id'                   => $n->id,
            'ncm'                  => $n->ncm,
            'nomeProduto'          => $n->nome_produto,
            'tributadoNormalmente' => (bool) $n->tributado_normalmente,
            'resultadoEconect'     => $n->resultado_econect,
        ];

        if (! empty($n->estados)) {
            $out['estados'] = $n->estados;
        } else {
            // Registro legado: expõe temMva/mvaValor na raiz (fallback do frontend).
            $out['temMva']   = (bool) $n->tem_mva;
            $out['mvaValor'] = $n->mva_valor;
        }

        return $out;
    }

    /** GET /api/ncm-fiscal?busca= */
    public function index(Request $request): JsonResponse
    {
        $query = NcmFiscal::query();

        if ($busca = trim((string) $request->input('busca'))) {
            $query->where(function ($q) use ($busca) {
                $q->where('ncm', 'like', "%{$busca}%")
                  ->orWhere('nome_produto', 'like', "%{$busca}%");
            });
        }

        $itens = $query->orderBy('ncm')->get()->map(fn ($n) => $this->toApi($n));

        return response()->json($itens);
    }

    /** POST /api/ncm-fiscal */
    public function store(Request $request): JsonResponse
    {
        $item = NcmFiscal::create($this->validar($request));

        return response()->json($this->toApi($item), 201);
    }

    /** PUT /api/ncm-fiscal/{ncm_fiscal} */
    public function update(Request $request, NcmFiscal $ncm_fiscal): JsonResponse
    {
        $ncm_fiscal->update($this->validar($request));

        return response()->json($this->toApi($ncm_fiscal));
    }

    /** DELETE /api/ncm-fiscal/{ncm_fiscal} */
    public function destroy(NcmFiscal $ncm_fiscal): JsonResponse
    {
        $ncm_fiscal->delete();

        return response()->json(null, 204);
    }

    /** POST /api/ncm-fiscal/importar — importação em lote dos dados locais. */
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'itens'             => ['required', 'array'],
            'itens.*.ncm'       => ['required'],
        ]);

        $importados = 0;
        foreach ($request->input('itens') as $item) {
            NcmFiscal::create([
                'ncm'                   => trim((string) ($item['ncm'] ?? '')),
                'nome_produto'          => $item['nomeProduto'] ?? $item['nome_produto'] ?? '(sem nome)',
                'tributado_normalmente' => (bool) ($item['tributadoNormalmente'] ?? false),
                'resultado_econect'     => $item['resultadoEconect'] ?? null,
                'estados'               => $item['estados'] ?? null,
                'tem_mva'               => array_key_exists('temMva', $item) ? (bool) $item['temMva'] : null,
                'mva_valor'             => $item['mvaValor'] ?? null,
            ]);
            $importados++;
        }

        return response()->json(['importados' => $importados], 201);
    }

    private function validar(Request $request): array
    {
        $v = $request->validate([
            'ncm'                  => ['required', 'string'],
            'nomeProduto'          => ['required', 'string'],
            'tributadoNormalmente' => ['boolean'],
            'resultadoEconect'     => ['nullable', 'string'],
            'estados'              => ['nullable', 'array'],
            'temMva'               => ['nullable', 'boolean'],
            'mvaValor'             => ['nullable', 'numeric'],
        ]);

        return [
            'ncm'                   => trim($v['ncm']),
            'nome_produto'          => $v['nomeProduto'],
            'tributado_normalmente' => $v['tributadoNormalmente'] ?? false,
            'resultado_econect'     => $v['resultadoEconect'] ?? null,
            'estados'               => $v['estados'] ?? null,
            'tem_mva'               => $v['temMva'] ?? null,
            'mva_valor'             => $v['mvaValor'] ?? null,
        ];
    }
}
