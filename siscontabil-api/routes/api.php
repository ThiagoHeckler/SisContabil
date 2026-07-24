<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NcmController;
use App\Http\Controllers\Api\NcmFiscalController;
use App\Http\Controllers\Api\PisCofinsRegraController;
use Illuminate\Support\Facades\Route;

// ── Autenticação ────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // Registros fiscais compartilhados (migrados do localStorage).
    Route::post('/pis-cofins-regras/importar', [PisCofinsRegraController::class, 'importar']);
    Route::apiResource('pis-cofins-regras', PisCofinsRegraController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::post('/ncm-fiscal/importar', [NcmFiscalController::class, 'importar']);
    Route::apiResource('ncm-fiscal', NcmFiscalController::class)
        ->only(['index', 'store', 'update', 'destroy']);
});

// ── NCM oficial (Siscomex) — leitura pública, dados oficiais ────────
Route::prefix('ncm')->group(function () {
    Route::get('/status',       [NcmController::class, 'status']);
    Route::post('/sincronizar', [NcmController::class, 'sincronizar']);
    Route::get('/{codigo}',     [NcmController::class, 'show']);
    Route::get('/',             [NcmController::class, 'index']);
});
