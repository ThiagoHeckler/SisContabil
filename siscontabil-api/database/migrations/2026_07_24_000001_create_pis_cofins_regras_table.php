<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pis_cofins_regras', function (Blueprint $table) {
            $table->id();
            $table->string('ncm', 8)->index();
            $table->string('descricao_produto')->nullable();
            $table->string('codigo_enquadramento');
            $table->string('tabela');
            $table->string('lei');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pis_cofins_regras');
    }
};
