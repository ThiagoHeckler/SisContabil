<?php

namespace App\Console\Commands;

use App\Services\NcmSincronizacaoService;
use Illuminate\Console\Command;

class SincronizarNcmCommand extends Command
{
    protected $signature   = 'ncm:sincronizar';
    protected $description = 'Sincroniza a tabela NCM com a API pública do Siscomex';

    public function handle(NcmSincronizacaoService $service): int
    {
        $this->info('Conectando à API do Siscomex...');

        try {
            $resultado = $service->sincronizar();

            $this->table(
                ['Campo', 'Valor'],
                [
                    ['Vigência',    $resultado['vigencia']],
                    ['Recebidos',   number_format($resultado['total'])],
                    ['Upsertados',  number_format($resultado['upsertados'])],
                    ['Desativados', number_format($resultado['desativados'])],
                    ['Duração',     $resultado['duracao_ms'] . ' ms'],
                ]
            );

            $this->info('Sincronização concluída com sucesso!');
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Erro: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
