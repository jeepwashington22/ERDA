'use client';

import { motion } from 'framer-motion';
import {
	ArrowRightIcon,
	ClipboardListIcon,
	DatabaseIcon,
	FileSpreadsheetIcon,
	KeyRoundIcon,
	ShieldCheckIcon,
	UsersIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	HeroParallax,
	type HeroParallaxProduct,
} from '@/components/ui/hero-parallax';

const heroProducts: HeroParallaxProduct[] = [
	['Student Registry', 'photo-1497366811353-6870744d04b2'],
	['Enrollment Desk', 'photo-1556761175-b413da4baf72'],
	['Operations Review', 'photo-1454165804606-c3d57bc86b40'],
	['Access Control', 'photo-1551288049-bebda4e38f71'],
	['Campus Workspace', 'photo-1517245386807-bb43f82c33c4'],
	['Team Handoffs', 'photo-1521737711867-e3b97375f902'],
	['Scholarship Planning', 'photo-1497366754035-f200968a6e72'],
	['Data Clarity', 'photo-1551434678-e076c223a692'],
	['Reporting Room', 'photo-1553877522-43269d4ea984'],
	['Staff Dashboard', 'photo-1531482615713-2afd69097998'],
	['Student Success', 'photo-1522202176988-66273c2fd55f'],
	['Secure Accounts', 'photo-1542744173-8e7e53415bb0'],
	['Clearer Processes', 'photo-1561070791-2526d30994b5'],
	['Admin Console', 'photo-1552664730-d307ca884978'],
	['Every Opportunity', 'photo-1523240795612-9a054b0db644'],
].map(([title, image]) => ({
	title,
	link: '#features',
	thumbnail: `https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=85`,
}));

const fadeUp = {
	initial: { opacity: 0, y: 24 } as const,
	whileInView: { opacity: 1, y: 0 } as const,
	viewport: { once: true, amount: 0.3 } as const,
};

const features = [
	{
		icon: UsersIcon,
		title: 'Student records',
		description:
			'One permanent record per student — identity, address, and household details kept clean, searchable, and editable.',
	},
	{
		icon: ClipboardListIcon,
		title: 'Yearly enrollment',
		description:
			'Track every school year’s school, course, and education status alongside the permanent record — nothing gets lost between terms.',
	},
	{
		icon: ShieldCheckIcon,
		title: 'Role-based access',
		description:
			'Staff handle daily operations; admins and super admins manage records and accounts. Everyone sees only what they should.',
	},
	{
		icon: KeyRoundIcon,
		title: 'Secure accounts',
		description:
			'Email-verified accounts, self-service password recovery, and admin-managed credentials keep every sign-in accountable.',
	},
	{
		icon: FileSpreadsheetIcon,
		title: 'Excel export',
		description:
			'Push any registry view to Excel for reports, compliance paperwork, and offline review in one click.',
	},
	{
		icon: DatabaseIcon,
		title: 'One source of truth',
		description:
			'Supabase-backed storage with pooled connections — a single, reliable source of truth for every campus process.',
	},
];

const roles = [
	{
		name: 'Super Admin',
		description:
			'Platform control center — institutional access, policy changes, and high-trust operations from one console.',
	},
	{
		name: 'Admin',
		description:
			'Operational command — approve workflows, manage records, and monitor day-to-day execution across teams.',
	},
	{
		name: 'Staff',
		description:
			'Daily workspace — routine tasks that keep the scholarship system moving, without higher-level controls.',
	},
];

export function LandingPage() {
	return (
		<div className="bg-background text-foreground min-h-screen">
			<LandingNav />
			<LandingHero />
			<LandingFeatures />
			<LandingRoles />
			<LandingCta />
			<LandingFooter />
		</div>
	);
}

function LandingFeatures() {
	return (
		<section id="features" className="scroll-mt-20 py-16 sm:py-24">
			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-bold tracking-tight">
						Everything your scholarship office runs on
					</h2>
					<p className="text-muted-foreground mt-3 text-base">
						Built around the way records, enrollments, and accounts actually
						move through your team — not around generic admin tables.
					</p>
				</motion.div>
				<div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature) => (
						<motion.article
							key={feature.title}
							{...fadeUp}
							className="bg-card hover:border-primary/40 rounded-xl border p-6 shadow-sm transition-colors"
						>
							<span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
								<feature.icon className="size-5" aria-hidden="true" />
							</span>
							<h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
							<p className="text-muted-foreground mt-2 text-sm leading-6">
								{feature.description}
							</p>
						</motion.article>
					))}
				</div>
			</div>
		</section>
	);
}

function LandingRoles() {
	return (
		<section className="bg-muted/40 border-y py-16 sm:py-24">
			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-bold tracking-tight">
						The right view for every role
					</h2>
					<p className="text-muted-foreground mt-3 text-base">
						Three access levels keep sensitive operations where they belong,
						while keeping daily work fast.
					</p>
				</motion.div>
				<div className="mt-12 grid gap-5 md:grid-cols-3">
					{roles.map((role, index) => (
						<motion.div
							key={role.name}
							{...fadeUp}
							transition={{ delay: index * 0.1 }}
							className="bg-card rounded-xl border p-6 shadow-sm"
						>
							<p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
								Role
							</p>
							<h3 className="mt-2 text-lg font-semibold">{role.name}</h3>
							<p className="text-muted-foreground mt-2 text-sm leading-6">
								{role.description}
							</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

function LandingCta() {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<motion.div
					{...fadeUp}
					className="bg-primary relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-16"
				>
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 opacity-40"
					>
						<div className="absolute top-0 right-0 h-48 w-72 translate-x-1/4 -translate-y-1/3 rounded-full bg-white/10 blur-2xl" />
						<div className="absolute bottom-0 left-0 h-48 w-72 -translate-x-1/4 translate-y-1/3 rounded-full bg-white/10 blur-2xl" />
					</div>
					<h2 className="relative text-3xl font-bold tracking-tight text-white">
						Ready to keep every scholar moving?
					</h2>
					<p className="relative mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
						Sign in with your ERDA Scholar account. Staff, admins, and super
						admins each land in the workspace built for their role.
					</p>
					<div className="relative mt-8">
						<Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
							<a href="/login">
								Sign in
								<ArrowRightIcon className="size-4" aria-hidden="true" />
							</a>
						</Button>
					</div>
				</motion.div>
			</div>
		</section>
	);
}

function LandingFooter() {
	return (
		<footer className="border-t py-10">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
				<div className="flex items-center gap-2">
					<BrandMark />
					<span className="text-sm font-semibold">ERDA Scholar System</span>
				</div>
				<p className="text-muted-foreground text-xs">
					&copy; {new Date().getFullYear()} Erda Scholar System. All rights
					reserved.
				</p>
				<a href="/login" className="text-muted-foreground hover:text-foreground text-xs font-medium">
					Sign in
				</a>
			</div>
		</footer>
	);
}

function BrandMark() {
	return (
		<span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-xs font-bold shadow-sm">
			ES
		</span>
	);
}



function LandingNav() {
	return (
		<header className="bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
				<div className="flex items-center gap-2">
					<BrandMark />
					<span className="text-sm font-bold tracking-tight">ERDA Scholar</span>
				</div>
				<div className="flex items-center gap-2">
					<a
						href="#features"
						className="text-muted-foreground hover:text-foreground hidden px-3 text-sm font-medium sm:block"
					>
						Features
					</a>
					<Button asChild size="sm">
						<a href="/login">
							Sign in
							<ArrowRightIcon className="size-4" aria-hidden="true" />
						</a>
					</Button>
				</div>
			</div>
		</header>
	);
}

function LandingHero() {
	return <HeroParallax products={heroProducts} />;
}
