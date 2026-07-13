// PM2 config:  pm2 start ecosystem.config.js
//
// Two things here are load-bearing, don't "simplify" them away:
//
// 1. node_args: --env-file=.env
//    PM2 does NOT read .env files. Without this the app boots with no SMTP
//    variables and exits immediately. The path is relative to `cwd` below.
//
// 2. exec_mode: fork, instances: 1
//    The rate limiter on /send-email keeps its counters in memory. In cluster
//    mode each worker would get its own counter, so the real limit would be
//    5 x (number of workers) per hour instead of 5. One process keeps it honest.
//    (This is a small static site — there is nothing to gain from clustering.)

module.exports = {
	apps: [
		{
			name: 'karolkonop-website',
			script: 'karolkonop-website-express-app.js',
			cwd: __dirname,
			node_args: '--env-file=.env',

			exec_mode: 'fork',
			instances: 1,

			env: {
				NODE_ENV: 'production',
			},

			// Do NOT run this with --watch on the server. PM2 writes its logs into
			// logs/ below, which sits inside cwd — so a watcher on cwd sees the log
			// write, restarts the app, the app logs its startup line, and you have an
			// infinite restart loop. Deploys here are deliberate: git pull, then
			// `pm2 restart karolkonop-website --update-env`.
			//
			// ignore_watch is kept so that if someone does enable watching, the loop
			// doesn't happen.
			watch: false,
			ignore_watch: ['logs', 'node_modules', '.git', 'public', 'assets', '.env'],

			autorestart: true,
			max_restarts: 10,
			// The app exits on a missing .env. Without this backoff PM2 would spin
			// on the failure; instead it gives up and leaves the error in the log.
			restart_delay: 2000,
			min_uptime: '10s',

			max_memory_restart: '200M',

			error_file: 'logs/error.log',
			out_file: 'logs/out.log',
			merge_logs: true,
			time: true,
		},
	],
};
