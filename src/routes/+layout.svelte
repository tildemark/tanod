<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<title>TANOD Desktop - Privacy-First Local DPO Workspace</title>
</svelte:head>

{@render children()}
