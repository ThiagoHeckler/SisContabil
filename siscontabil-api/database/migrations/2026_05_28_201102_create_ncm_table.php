<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ncm', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->text('descricao');
            $table->date('data_inicio')->nullable();
            $table->date('data_fim')->nullable();
            $table->string('tipo_ato_ini', 50)->nullable();
            $table->string('numero_ato_ini', 20)->nullable();
            $table->string('ano_ato_ini', 10)->nullable();
            $table->boolean('ativo')->default(true)->index();
            $table->string('vigencia_siscomex')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ncm');
    }
};
