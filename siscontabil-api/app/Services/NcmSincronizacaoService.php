<?php

namespace App\Services;

use App\Models\Ncm;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NcmSincronizacaoService
{
    private const DATA_FIM_INDEFINIDA = '31/12/9999';

    public function __construct(
        private readonly SiscomexNcmService $siscomexService
    ) {}

    /**
     * Executa a sincronização completa: download → upsert → desativa obsoletos.
     *
     * @return array{total: int, upsertados: int, desativados: int, duracao_ms: int, vigencia: string}
     */
    public function sincronizar(): array
    {
        $inicio = now();
        Log::info('[NCM] === Iniciando sincronização ===');

        $dados         = $this->siscomexService->baixar();
        $nomenclaturas = $dados['nomenclaturas'];
        $vigencia      = $dados['dataUltimaAtualizacao'];

        $registros = collect($nomenclaturas)->map(fn($item) => [
            'codigo'            => $item['Codigo'],
            'descricao'         => $item['Descricao'],
            'data_inicio'       => $this->parseData($item['Data_Inicio'] ?? null),
            'data_fim'          => $this->parseData($item['Data_Fim'] ?? null),
            'tipo_ato_ini'      => $item['Tipo_Ato_Ini'] ?? null,
            'numero_ato_ini'    => $item['Numero_Ato_Ini'] ?? null,
            'ano_ato_ini'       => $item['Ano_Ato_Ini'] ?? null,
            'ativo'             => true,
            'vigencia_siscomex' => $vigencia,
            'created_at'        => now(),
            'updated_at'        => now(),
        ])->toArray();

        // Upsert em chunks de 500 (SQLite lida bem; evita limit de bind params)
        $upsertados = 0;
        foreach (array_chunk($registros, 500) as $chunk) {
            DB::table('ncm')->upsert(
                $chunk,
                ['codigo'],
                [
                    'descricao', 'data_inicio', 'data_fim',
                    'tipo_ato_ini', 'numero_ato_ini', 'ano_ato_ini',
                    'ativo', 'vigencia_siscomex', 'updated_at',
                ]
            );
            $upsertados += count($chunk);
        }

        // Desativa códigos que não vieram na resposta (revogados)
        $codigosRecebidos = collect($nomenclaturas)->pluck('Codigo')->toArray();
        $desativados = Ncm::query()
            ->where('ativo', true)
            ->whereNotIn('codigo', $codigosRecebidos)
            ->update(['ativo' => false, 'updated_at' => now()]);

        $duracaoMs = (int) $inicio->diffInMilliseconds(now());

        Log::info('[NCM] === Sincronização concluída ===', compact(
            'upsertados', 'desativados', 'duracaoMs'
        ));

        return [
            'total'       => count($nomenclaturas),
            'upsertados'  => $upsertados,
            'desativados' => $desativados,
            'duracao_ms'  => $duracaoMs,
            'vigencia'    => $vigencia,
        ];
    }

    private function parseData(?string $valor): ?string
    {
        if (!$valor || trim($valor) === self::DATA_FIM_INDEFINIDA) {
            return null;
        }

        try {
            return Carbon::createFromFormat('d/m/Y', trim($valor))->toDateString();
        } catch (\Exception) {
            return null;
        }
    }
}
