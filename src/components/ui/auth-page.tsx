'use client';

import React, { useEffect, useState } from 'react';
import {
	AtSignIcon,
	ChevronLeftIcon,
	EyeIcon,
	EyeOffIcon,
	LockIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type AuthPageSubmitValues = {
	email: string;
	password: string;
	rememberMe: boolean;
};

export type AuthPageProps = {
	onSubmit: (values: AuthPageSubmitValues) => void | Promise<void>;
	submitting?: boolean;
	error?: string | null;
	homeHref?: string;
	forgotPasswordHref?: string;
	brandName?: string;
};

const REMEMBERED_EMAIL_KEY = 'erda-scholar.remembered-email';

export function AuthPage({
	onSubmit,
	submitting = false,
	error = null,
	homeHref = '/',
	forgotPasswordHref = '/forgot-password',
	brandName = 'ERDA Scholar',
}: AuthPageProps) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		const saved = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
		if (saved) {
			setEmail(saved);
			setRememberMe(true);
		}
	}, []);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmedEmail = email.trim();
		if (rememberMe && trimmedEmail) {
			window.localStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
		} else {
			window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
		}
		void onSubmit({ email: trimmedEmail, password, rememberMe });
	}

	return (
		<main className="relative min-h-screen bg-[#f4f1eb] lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
			<div className="relative hidden h-full flex-col overflow-hidden border-r border-white/10 bg-[#16302b] p-10 text-white lg:flex">
				<div className="absolute inset-0 z-10 bg-gradient-to-t from-[#16302b] via-transparent to-black/10" />
				<div className="z-10 flex items-center gap-2">
					<BrandMark />
					<p className="text-xl font-semibold tracking-tight">{brandName}</p>
				</div>
				<div className="z-10 mt-auto">
					<p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
						Scholar operations platform
					</p>
					<blockquote className="max-w-lg space-y-4">
						<p className="text-3xl font-semibold leading-tight tracking-tight">
							&ldquo;Scholar records, enrollments, and accounts &mdash; everything
							in one place. We serve our students faster than ever before.&rdquo;
						</p>
						<footer className="text-sm font-medium text-white/65">
							~ ERDA Operations Team
						</footer>
					</blockquote>
				</div>
				<div className="absolute inset-0">
					<FloatingPaths position={1} />
					<FloatingPaths position={-1} />
				</div>
			</div>
			<div className="relative flex min-h-screen flex-col justify-center bg-[#f4f1eb] p-4 sm:p-8">
				<div
					aria-hidden
					className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
				>
					<div className="absolute top-0 right-0 h-80 w-35 -translate-y-22 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(15,23,42,0.06)_0,rgba(140,140,140,0.02)_50%,rgba(15,23,42,0.01)_80%)]" />
					<div className="absolute top-0 right-0 h-80 w-60 [translate:5%_-50%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(15,23,42,0.04)_0,rgba(15,23,42,0.01)_80%,transparent_100%)]" />
					<div className="absolute top-0 right-0 h-80 w-60 -translate-y-22 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(15,23,42,0.04)_0,rgba(15,23,42,0.01)_80%,transparent_100%)]" />
				</div>
				<Button variant="ghost" className="absolute top-7 left-5" asChild>
					<a href={homeHref}>
						<ChevronLeftIcon className="size-4 me-2" />
						Home
					</a>
				</Button>
				<div className="mx-auto w-full space-y-6 rounded-2xl border border-black/10 bg-white/85 p-7 shadow-[0_24px_70px_rgba(22,48,43,0.12)] backdrop-blur-sm sm:w-sm sm:p-10">
					<div className="flex items-center gap-2 lg:hidden">
						<BrandMark />
						<p className="text-xl font-semibold">{brandName}</p>
					</div>
					<div className="flex flex-col space-y-2">
						<h1 className="font-heading text-3xl font-bold tracking-tight">
							Welcome back
						</h1>
						<p className="text-muted-foreground text-sm leading-6">
							Sign in to your ERDA Scholar workspace.
						</p>
					</div>
					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<label
								htmlFor="auth-email"
								className="text-sm font-medium text-foreground"
							>
								Email
							</label>
							<div className="relative h-max">
								<Input
									id="auth-email"
									name="email"
									placeholder="name@school.edu"
									className="peer ps-9"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
								/>
								<div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
									<AtSignIcon className="size-4" aria-hidden="true" />
								</div>
							</div>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="auth-password"
								className="text-sm font-medium text-foreground"
							>
								Password
							</label>
							<div className="relative h-max">
								<Input
									id="auth-password"
									name="password"
									placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
									className="peer pe-10"
									type={showPassword ? 'text' : 'password'}
									autoComplete="current-password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
								/>
								<div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
									<LockIcon className="size-4" aria-hidden="true" />
								</div>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									className="text-muted-foreground absolute inset-y-0 end-0 flex items-center justify-center pe-3 hover:text-foreground"
								>
									{showPassword ? (
										<EyeOffIcon className="size-4" aria-hidden="true" />
									) : (
										<EyeIcon className="size-4" aria-hidden="true" />
									)}
								</button>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={rememberMe}
									onChange={(event) => setRememberMe(event.target.checked)}
									className="accent-primary size-4"
								/>
								Remember me
							</label>
							<a
								href={forgotPasswordHref}
								className="text-primary hover:text-primary/80 text-sm font-medium underline-offset-4 hover:underline"
							>
								Forgot password?
							</a>
						</div>
						{error ? (
							<div
								role="alert"
								className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
							>
								{error}
							</div>
						) : null}
						<Button type="submit" className="w-full" disabled={submitting}>
							{submitting ? 'Signing in…' : 'Sign in'}
						</Button>
					</form>
					<p className="text-muted-foreground mt-6 text-sm">
						By clicking continue, you agree to the Erda Scholar System access
						policy.
					</p>
				</div>
			</div>
		</main>
	);
}

function FloatingPaths({ position }: { position: number }) {
	const paths = Array.from({ length: 36 }, (_, i) => ({
		id: i,
		d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
			380 - i * 5 * position
		} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
			152 - i * 5 * position
		} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
			684 - i * 5 * position
		} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
		color: `rgba(15,23,42,${0.1 + i * 0.03})`,
		width: 0.5 + i * 0.03,
	}));

	return (
		<div className="pointer-events-none absolute inset-0">
			<svg
				className="h-full w-full text-slate-950 dark:text-white"
				viewBox="0 0 696 316"
				fill="none"
			>
				<title>Background Paths</title>
				{paths.map((path) => (
						<path
						key={path.id}
						d={path.d}
						stroke="currentColor"
						strokeWidth={path.width}
						strokeOpacity={0.1 + path.id * 0.03}
					/>
				))}
			</svg>
		</div>
	);
}

function BrandMark() {
	return (
		<span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-xs font-bold shadow-sm">
			ES
		</span>
	);
}


