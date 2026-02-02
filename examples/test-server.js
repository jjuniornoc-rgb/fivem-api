/**
 * Script para testar a API contra um servidor FiveM.
 * Usa FIVEM_ADDRESS e FIVEM_PORT do ambiente, ou 93.123.22.56:30120 como padrão.
 *
 * Uso: npm run build && node examples/test-server.js
 */

const { DiscordFivemApi } = require('../dist/index.js');

const address = process.env.FIVEM_ADDRESS || '93.123.22.56';
const port = Number(process.env.FIVEM_PORT || '30120');

async function main() {
  console.log(`Testando servidor ${address}:${port}...\n`);

  const api = new DiscordFivemApi({
    address,
    port,
    useStructure: true,
    cacheTtlMs: 5000,
    retry: { maxAttempts: 2, initialDelayMs: 500 },
  });

  try {
    // Status
    const status = await api.getStatus();
    console.log('1. getStatus():', status);

    // Dados do servidor
    const serverData = await api.getServerData();
    console.log('2. getServerData():', status === 'online' ? 'OK (dados recebidos)' : 'offline');
    if (status === 'online' && serverData && typeof serverData === 'object' && 'vars' in serverData) {
      const vars = serverData.vars || {};
      console.log('   - sv_maxClients:', vars.sv_maxClients);
    }

    // Jogadores
    const players = await api.getServerPlayers();
    const list = Array.isArray(players) ? players : [];
    console.log('3. getServerPlayers():', list.length, 'jogador(es)');

    // Contagens
    const online = await api.getPlayersOnline();
    const max = await api.getMaxPlayers();
    console.log('4. getPlayersOnline():', online);
    console.log('5. getMaxPlayers():', max);

    // Filtro e ordenação (se houver jogadores)
    if (list.length > 0) {
      const filtered = api.filterPlayers(list, (p) => (p && typeof p === 'object' && (p.name || p.id)) || false);
      const sorted = api.sortPlayers(filtered, 'name', 'asc');
      console.log('6. filterPlayers + sortPlayers(by name):', sorted.length, 'jogador(es)');
      sorted.slice(0, 3).forEach((p, i) => {
        const name = p && typeof p === 'object' ? (p.name ?? p.id ?? '?') : '?';
        console.log(`   [${i + 1}]`, name);
      });
    }

    console.log('\nTestes concluídos.');
  } catch (err) {
    console.error('Erro:', err.message || err);
    if (err.error) console.error('Detalhe:', err.error);
    process.exit(1);
  }
}

main();
