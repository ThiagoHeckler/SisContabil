<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NcmResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'codigo'      => $this->codigo,
            'descricao'   => $this->descricao,
            'data_inicio' => $this->data_inicio?->format('d/m/Y'),
            'data_fim'    => $this->data_fim?->format('d/m/Y'),
            'ativo'       => $this->ativo,
            'vigencia'    => $this->vigencia_siscomex,
        ];
    }
}
