<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sincroniza NCM toda segunda-feira às 06:00 (tabela muda raramente)
Schedule::command('ncm:sincronizar')->weeklyOn(1, '06:00');
