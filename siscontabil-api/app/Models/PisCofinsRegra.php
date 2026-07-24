<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PisCofinsRegra extends Model
{
    protected $table = 'pis_cofins_regras';

    protected $fillable = [
        'ncm',
        'descricao_produto',
        'codigo_enquadramento',
        'tabela',
        'lei',
    ];
}
