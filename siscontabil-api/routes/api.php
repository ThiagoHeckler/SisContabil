<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NcmController;
use Illuminate\Support\Facades\Route;

// ── Autenticação ────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);
});

// ── NCM oficial (Siscomex) — leitura pública, dados oficiais ────────
Route::prefix('ncm')->group(function () {
    Route::get('/status',       [NcmController::class, 'status']);
    Route::post('/sincronizar', [NcmController::class, 'sincronizar']);
    Route::get('/{codigo}',     [NcmController::class, 'show']);
    Route::get('/',             [NcmController::class, 'index']);
});
