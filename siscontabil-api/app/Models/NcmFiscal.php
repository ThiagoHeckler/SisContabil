<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NcmFiscal extends Model
{
    protected $table = 'ncm_fiscal';

    protected $fillable = [
        'ncm',
        'nome_produto',
        'tributado_normalmente',
        'resultado_econect',
        'estados',
        'tem_mva',
        'mva_valor',
    ];

    protected function casts(): array
    {
        return [
            'tributado_normalmente' => 'boolean',
            'tem_mva'               => 'boolean',
            'mva_valor'             => 'float',
            'estados'               => 'array',
        ];
    }
}
