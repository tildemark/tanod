<script lang="ts">
	import './layout.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=2" />
	<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
	<title>TANOD Desktop - Privacy-First Local DPO Workspace</title>
</svelte:head>

<div class="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
	<!-- Sidebar -->
	<Sidebar />

	<!-- Main Workspace Area -->
	<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
		<Header />
		<main class="flex-1 overflow-y-auto p-8">
			{@render children()}
		</main>
	</div>
</div>
