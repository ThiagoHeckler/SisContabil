<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SiscomexNcmService
{
    private const URL = 'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json';

    /**
     * Baixa a tabela NCM completa da API pública do Siscomex.
     *
     * @return array{dataUltimaAtualizacao: string, ato: string, nomenclaturas: array}
     * @throws \RuntimeException
     */
    public function baixar(): array
    {
        Log::info('[NCM] Iniciando download da tabela NCM via Siscomex...');

        try {
            $verificarSsl = config('services.siscomex.verify_ssl', true);

            $response = Http::timeout(120)
                ->withUserAgent('SisContabil/1.0')
                ->withOptions(['verify' => $verificarSsl])
                ->acceptJson()
                ->get(self::URL, ['perfil' => 'PUBLICO']);

            if ($response->failed()) {
                throw new \RuntimeException(
                    "API Siscomex retornou status {$response->status()}"
                );
            }

            $data = $response->json();

            Log::info('[NCM] Download concluído.', [
                'total'    => count($data['Nomenclaturas'] ?? []),
                'vigencia' => $data['Data_Ultima_Atualizacao_NCM'] ?? '-',
            ]);

            return [
                'dataUltimaAtualizacao' => $data['Data_Ultima_Atualizacao_NCM'] ?? '',
                'ato'                   => $data['Ato'] ?? '',
                'nomenclaturas'         => $data['Nomenclaturas'] ?? [],
            ];

        } catch (ConnectionException $e) {
            throw new \RuntimeException('Sem conexão com a API Siscomex: ' . $e->getMessage());
        }
    }
}
