import { version } from '../package.json';
import { DiscordFivemApi } from './DiscordFivemApi';
import { MultiServerManager } from './MultiServerManager';
import { Player, Server } from './structures/index';

export { version, DiscordFivemApi, MultiServerManager, Player, Server };
export {
  isCfxJoinLink,
  extractCfxCode,
  resolveCfxJoinCode,
  resolveCfxJoinLink,
  resolveCfxJoinCodeCached,
} from './util/cfxResolver';
export type { CfxResolvedEndpoint } from './util/cfxResolver';
export type {
  DiscordFivemApiOptions,
  DiscordFivemApiServerEntry,
  RawServerInfo,
  RawPlayerIdentifiers,
  RetryOptions,
  CircuitBreakerOptions,
  PlayerFilter,
  PlayerSortKey,
} from './types';
