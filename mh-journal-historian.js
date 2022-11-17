// ==UserScript==
// @name         MouseHunt - Journal Historian
// @namespace    https://greasyfork.org/en/users/900615-personalpalimpsest
// @version      1.1.3
// @license      GNU GPLv3
// @description  Saves journal entries and offers more viewing options
// @author       asterios
// @match        http://www.mousehuntgame.com/*
// @match        https://www.mousehuntgame.com/*
// @icon         https://www.mousehuntgame.com/images/mice/thumb/de5de32f7ece2076dc405016d0c53302.gif?cv=2
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

(function () {
	const debug = false;

	function entryStripper(entry) {
		if (entry.classList.contains('animated')) {
			entry.classList.remove('animated');
		}
		if (entry.classList.contains('newEntry')) {
			entry.classList.remove('newEntry');
		}
		if (entry.classList.contains('newEntry')) {
			entry.classList.remove('newEntry');
		}
		entry.style = null;
	}

	function saveEntries() {
		const saveDebug = false;

		if (debug) console.log('Saving entries');
		const entries = document.querySelectorAll('.entry');
		const savedEntries = getSavedEntriesFromStorage();

		entries.forEach((entry) => {
			const entryId = entry.dataset.entryId

			if (savedEntries[entryId]) {
				if (saveDebug) console.log(`Entry ${entryId} already stored`);
			}
			else {
				if (saveDebug) console.log(`Stored new entry ${entryId}`);
				$.toast({
					text: `Stored new entry ${entryId}`,
					stack: 24
				});
				entryStripper(entry);
				savedEntries[entry.dataset.entryId] = entry.outerHTML;
			}
		})

		setSavedEntriesToStorage(savedEntries);
	}

	const observerTarget = document.querySelector(`#journalContainer .content`);
	const observer = new MutationObserver(function (mutations) {
		const mutationDebug = false;

		if (debug) console.log('mutated');
		if (mutationDebug) {
			for (const mutation of mutations) {
				console.log({mutation});
				console.log(mutation.target);
			}
		}
		// Only save if something was added.
		if (mutations.some(v => v.type === 'childList' && v.addedNodes.length > 0)) {
			saveEntries();
		}
	});

	observer.observe(observerTarget, {
		childList: true,
		subtree: true
	});

	const xhrObserver = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function () {
		this.addEventListener('load', function () {
			if (this.responseURL == `https://www.mousehuntgame.com/managers/ajax/turns/activeturn.php`) {
				if (debug) console.log('horn detected');
				saveEntries();
			} else if (this.responseURL == `https://www.mousehuntgame.com/managers/ajax/pages/page.php`) {
				renderBtns();
			}
		})
		xhrObserver.apply(this, arguments);
	}

	function renderSavedEntries() {
		const savedEntries = getSavedEntriesFromStorage();
		const journal = document.querySelector(`#journalEntries${user.user_id}`);
		for (const [id, entry] of Object.entries(savedEntries)) {
			if (entry) {
				const frag = document.createRange().createContextualFragment(entry);
				journal.prepend(frag);
			}
		}
	}

	function getSavedEntriesFromStorage() {
		const compressed = localStorage.getItem('mh-journal-historian');
		const decompressed = LZString.decompressFromUTF16(compressed);

		var savedEntries;
		try {
			savedEntries = JSON.parse(decompressed);
		} catch {
			savedEntries = {};
		}

		return savedEntries;
	}

	function setSavedEntriesToStorage(entries) {
		const savedEntries = JSON.stringify(entries);
		const compressed = LZString.compressToUTF16(savedEntries);
		localStorage.setItem('mh-journal-historian', compressed);
	}

	function mpCleanUp() {
		const mp = document.querySelectorAll('.marketplace');
		mp.forEach((entry)=>{entry.remove()})
	}

	function classifier(entry) {
		const classifierDebug = false;

		if (debug) console.log('Running classifier');
		const id = entry.dataset.entryId;
		if (classifierDebug) console.log({id});
		const cssClass = entry.className;

		if (cssClass.search(/(catchfailure|catchsuccess|attractionfailure|stuck_snowball_catch)/) !== -1) {
			if (classifierDebug) console.log('Hunts');
			if (classifierDebug) console.log({cssClass});
			entry.classList.add('jhHunts');
		}
		else if (cssClass.search(/(relicHunter_catch|relicHunter_failure|prizemouse)/) !== -1) {
			if (classifierDebug) console.log('Bonus Hunts');
			if (classifierDebug) console.log({cssClass});
			entry.classList.add('jhHunts');
		}
		else if (cssClass.search(/(relicHunter_start|relicHunter_complete)/) !== -1) {
			if (classifierDebug) console.log('Mapping');
			if (classifierDebug) console.log({cssClass});
			entry.classList.add('jhMapping');
		}
		else if (cssClass.search(/(marketplace)/) !== -1) {
			if (classifierDebug) console.log('Marketplace');
			if (classifierDebug) console.log({cssClass});
			entry.classList.add('jhMarketplace');
		}
		else if (cssClass.search(/(supplytransferitem)/) !== -1) {
			if (classifierDebug) console.log('Trading');
			if (classifierDebug) console.log({cssClass});
			entry.classList.add('jhTrading');
		}
		else if (cssClass.search(/(convertible_open)/) !== -1) {
			if (classifierDebug) console.log('Convertible');
			if (classifierDebug) console.log({cssClass});
			entry.classList.add('jhConvertible');
		}
		else {
			if (classifierDebug) console.log('Misc');
			if (classifierDebug) console.log({cssClass});
			entry.classList.add('jhMisc');
		}
	}

	function massClasser() {
		if (debug) console.log('Running massClasser');
		const entries = document.querySelectorAll('.entry');

		entries.forEach((entry)=>{

			classifier(entry);
		})
	}

	function entryFilter(filterType) {
		if (debug) console.log('Filtering entries');
		const allEntries = document.querySelectorAll('.entry');
		for (const e of allEntries) {e.style.display = 'none'}
		console.log({filterType});
		const selectedEntries = document.querySelectorAll(`.${filterType}`);
		for (const se of selectedEntries) {se.style.display = 'block'}
	}

	function renderBtns() {
		if (debug) console.log('Rendering buttons');
		const hoverBtn = document.querySelector('.journalContainer-selectTheme');
		const hoverDiv = hoverBtn.parentElement;
		hoverDiv.style.display = 'flex';
		hoverDiv.style.flexDirection = 'row';
		hoverDiv.style.alignItems = 'center';
		hoverBtn.style.position = 'initial';
		hoverBtn.style.transform = 'none';
		hoverBtn.style.flex = 'auto';
		hoverBtn.style.height = '20px';

		let filterType = ['Hunts','Marketplace','Mapping','Trading','Convertible','Misc'];
		for (let i = 0; i < 6; i++) {
			let clone = hoverBtn.cloneNode(true);
			clone.innerHTML = filterType[i];
			clone.style.backgroundImage = 'none';
			clone.style.padding = '0 0 0 5px';
			clone.onclick = (()=>{
				massClasser();
				entryFilter(`jh${clone.innerHTML}`);
				// renderBtns();
			})
			hoverDiv.insertBefore(clone,hoverBtn);
		}

		const lastBtn = document.querySelector('.pagerView-lastPageLink.pagerView-link');
		const infiniteBtn = lastBtn.cloneNode(true);
		infiniteBtn.innerHTML = 'Infinite.';
		infiniteBtn.onclick = renderSavedEntries;
		lastBtn.after(infiniteBtn);
		document.querySelectorAll('.pagerView-link').forEach((el)=>{
			el.style.margin = "0 2px";
			el.style.padding = "3px";
		})
	}
	saveEntries();
	renderBtns();
})();
