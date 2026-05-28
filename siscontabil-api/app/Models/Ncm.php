<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Ncm extends Model
{
    protected $table = 'ncm';

    protected $fillable = [
        'codigo', 'descricao', 'data_inicio', 'data_fim',
        'tipo_ato_ini', 'numero_ato_ini', 'ano_ato_ini',
        'ativo', 'vigencia_siscomex',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_fim'    => 'date',
        'ativo'       => 'boolean',
    ];

    public function scopeAtivos(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }

    /** Busca por código (LIKE) ou descrição (LIKE). SQLite-compatible. */
    public function scopeBusca(Builder $query, string $termo): Builder
    {
        return $query->where(function (Builder $q) use ($termo) {
            $q->where('codigo', 'like', "%{$termo}%")
              ->orWhere('descricao', 'like', "%{$termo}%");
        });
    }
}
