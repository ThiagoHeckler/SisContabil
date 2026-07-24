<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ncm_fiscal', function (Blueprint $table) {
            $table->id();
            $table->string('ncm', 20)->index();
            $table->string('nome_produto');
            $table->boolean('tributado_normalmente')->default(false);
            $table->string('resultado_econect')->nullable();
            // MVA / antecipação por estado (MT, PA, GO). Ex.:
            // {"MT":{"temMva":true,"mvaValor":30.37},
            //  "PA":{"temMva":true,"mvaValor":30.37,"temAntecipado":true,"aliquotaAntecipado":15},
            //  "GO":{"temMva":false,"mvaValor":null}}
            $table->json('estados')->nullable();
            // Campos legados (registros antigos sem detalhamento por estado).
            $table->boolean('tem_mva')->nullable();
            $table->decimal('mva_valor', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ncm_fiscal');
    }
};
