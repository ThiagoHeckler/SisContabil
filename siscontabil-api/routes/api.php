<?php

use App\Http\Controllers\Api\NcmController;
use Illuminate\Support\Facades\Route;

Route::prefix('ncm')->group(function () {
    Route::get('/status',       [NcmController::class, 'status']);
    Route::post('/sincronizar', [NcmController::class, 'sincronizar']);
    Route::get('/{codigo}',     [NcmController::class, 'show']);
    Route::get('/',             [NcmController::class, 'index']);
});
