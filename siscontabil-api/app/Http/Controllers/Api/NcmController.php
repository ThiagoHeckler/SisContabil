<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NcmResource;
use App\Models\Ncm;
use App\Services\NcmSincronizacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NcmController extends Controller
{
    public function __construct(
        private readonly NcmSincronizacaoService $sincronizacaoService
    ) {}

    /**
     * GET /api/ncm?busca=cavalos
     * Busca por código ou descrição (LIKE, SQLite-compatible).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'busca' => ['nullable', 'string', 'min:2', 'max:100'],
        ]);

        $query = Ncm::ativos();

        if ($busca = $request->input('busca')) {
            $query->busca($busca);
        }

        $ncms = $query->orderBy('codigo')->paginate(50);

        return NcmResource::collection($ncms);
    }

    /**
     * GET /api/ncm/{codigo}
     * Busca exata por código.
     */
    public function show(string $codigo): NcmResource|JsonResponse
    {
        $ncm = Ncm::where('codigo', $codigo)->first();

        if (!$ncm) {
            return response()->json(['message' => 'NCM não encontrado'], 404);
        }

        return new NcmResource($ncm);
    }

    /**
     * POST /api/ncm/sincronizar
     * Dispara a sincronização via HTTP (botão na UI).
     */
    public function sincronizar(): JsonResponse
    {
        try {
            $resultado = $this->sincronizacaoService->sincronizar();
            return response()->json($resultado);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/ncm/status
     * Metadados da tabela para exibir na UI.
     */
    public function status(): JsonResponse
    {
        $total    = Ncm::ativos()->count();
        $vigencia = Ncm::ativos()->value('vigencia_siscomex');

        return response()->json([
            'total'        => $total,
            'vigencia'     => $vigencia,
            'sincronizado' => $total > 0,
        ]);
    }
}
