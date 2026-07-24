<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Usuário admin padrão. Credenciais podem ser sobrescritas via .env.
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@siscontabil.local')],
            [
                'name'     => env('ADMIN_NAME', 'Administrador'),
                'password' => Hash::make(env('ADMIN_PASSWORD', 'siscontabil')),
            ]
        );
    }
}
