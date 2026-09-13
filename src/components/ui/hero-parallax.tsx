'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
	motion,
	useScroll,
	useSpring,
	useTransform,
	type MotionValue,
} from 'framer-motion';
import * as React from 'react';

export type HeroParallaxProduct = {
	title: string;
	link: string;
	thumbnail: string;
};

type HeroParallaxProps = {
	products: HeroParallaxProduct[];
};

const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

export function HeroParallax({ products }: HeroParallaxProps) {
	const firstRow = products.slice(0, 5);
	const secondRow = products.slice(5, 10);
	const thirdRow = products.slice(10, 15);
	const ref = React.useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ['start start', 'end start'],
	});

	const translateX = useSpring(
		useTransform(scrollYProgress, [0, 1], [0, 720]),
		springConfig,
	);
	const translateXReverse = useSpring(
		useTransform(scrollYProgress, [0, 1], [0, -720]),
		springConfig,
	);
	const rotateX = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [12, 0]),
		springConfig,
	);
	const opacity = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [0.35, 1]),
		springConfig,
	);
	const rotateZ = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [8, 0]),
		springConfig,
	);
	const translateY = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [-320, 180]),
		springConfig,
	);

	return (
		<section
			ref={ref}
			className="relative flex h-[250vh] flex-col overflow-hidden bg-[#16302b] py-24 antialiased [perspective:1000px] [transform-style:preserve-3d] sm:py-32"
		>
			<HeroHeader />
			<motion.div
				style={{ rotateX, rotateZ, translateY, opacity }}
				className="relative z-10"
			>
				<ParallaxRow products={firstRow} translate={translateX} reverse />
				<ParallaxRow products={secondRow} translate={translateXReverse} />
				<ParallaxRow products={thirdRow} translate={translateX} reverse />
			</motion.div>
		</section>
	);
}

function HeroHeader() {
	return (
		<div className="relative z-20 mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8 sm:pb-24">
			<p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#d7a95b]">
				Scholarship operations platform
			</p>
			<h1 className="max-w-4xl text-4xl font-semibold leading-[0.98] tracking-tight text-[#f6f1e8] sm:text-6xl md:text-8xl">
				Make every student opportunity count.
			</h1>
			<p className="mt-7 max-w-2xl text-base leading-7 text-[#c6d2cb] sm:text-lg">
				A focused workspace for student records, yearly enrollments, and
				scholarship access, built for the people who keep education moving.
			</p>
			<div className="mt-8 flex flex-wrap items-center gap-4 text-sm font-semibold">
				<Link
					href="/login"
					className="rounded-full bg-[#d7a95b] px-5 py-3 text-[#16302b] transition-colors hover:bg-[#e5be7d]"
				>
					Enter workspace
				</Link>
				<span className="text-[#9eafa7]">Scroll to explore the system</span>
			</div>
		</div>
	);
}

function ParallaxRow({
	products,
	translate,
	reverse = false,
}: {
	products: HeroParallaxProduct[];
	translate: MotionValue<number>;
	reverse?: boolean;
}) {
	return (
		<motion.div
			style={{ x: translate }}
			className={`mb-5 flex w-max gap-5 sm:mb-8 sm:gap-8 ${reverse ? 'flex-row-reverse' : ''}`}
		>
			{products.map((product) => (
				<ProductCard key={product.title} product={product} />
			))}
		</motion.div>
	);
}

function ProductCard({ product }: { product: HeroParallaxProduct }) {
	return (
		<motion.article
			whileHover={{ y: -20 }}
			className="group/product relative h-56 w-[16rem] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#25443d] sm:h-72 sm:w-[23rem]"
		>
			<Link href={product.link} className="relative block h-full w-full">
				<Image
					src={product.thumbnail}
					fill
					sizes="(max-width: 640px) 256px, 368px"
					className="object-cover object-center transition duration-500 group-hover/product:scale-105"
					alt={product.title}
				/>
				<span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
				<span className="absolute inset-x-5 bottom-4 text-lg font-semibold text-white">
					{product.title}
				</span>
			</Link>
		</motion.article>
	);
}
