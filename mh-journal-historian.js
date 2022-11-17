// ==UserScript==
// @name         MouseHunt - Journal Historian
// @namespace    https://greasyfork.org/en/users/900615-personalpalimpsest
// @version      1.3.4
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
	const debug = true;
	const filterDebug = false;
	const saveDebug = false;
	const mutationDebug = false;
	const classifierDebug = false;

	function entryStripper(entry) {
		if (entry.classList.contains('animated')) {
			entry.classList.remove('animated');
		}
		if (entry.classList.contains('newEntry')) {
			entry.classList.remove('newEntry');
		}
		entry.style = null;
	}

	function saveEntries() {
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
				classifier(entry);
				entryStripper(entry);
				savedEntries[entry.dataset.entryId] = entry.outerHTML;
			}
		});
		setSavedEntriesToStorage(savedEntries);
	}

	const observerTarget = document.querySelector(`#journalContainer .content`);
	const observer = new MutationObserver(function (mutations) {
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
			loadTgl();
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
				loadTgl();
			} else if (this.responseURL == `https://www.mousehuntgame.com/managers/ajax/pages/page.php`) {
				renderBtns();
			}
		})
		xhrObserver.apply(this, arguments);
	}

	function renderSavedEntries() {
		const savedEntries = getSavedEntriesFromStorage();
		const journal = document.querySelector(`#journalEntries${user.user_id}`);
		const existingEntries = journal.querySelectorAll('.entry');

		if (debug) console.log({existingEntries});
		for (const entry of existingEntries) {entry.remove();}

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

	function classifier(entry) {
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

	const tglTypes = JSON.parse(localStorage.getItem('mh-journal-historian-toggles')) || {};

	function entryFilterTgl(filterType) {
		if (debug) console.log(`Filtering ${filterType} entries`);
		const typeEntries = document.querySelectorAll(`.entry.jh${filterType}`);
		const type = filterType;

		if (filterDebug) console.log(tglTypes[`${type}`]);
		for (const e of typeEntries) {
			tglTypes[`${type}`] ? e.style.display = 'none' : e.style.display = 'block';
		}
		tglTypes[`${type}`] = !tglTypes[`${type}`];
		localStorage.setItem('mh-journal-historian-toggles',JSON.stringify(tglTypes));
	}

	function loadTgl() {
		if (debug) console.log('Running initial toggle');
		for (const type in tglTypes) {
			tglTypes[`${type}`] = !tglTypes[`${type}`];
			if (filterDebug) console.log(tglTypes[`${type}`]);
			entryFilterTgl(type);
			if (filterDebug) console.log(tglTypes[`${type}`]);
		}
	}

	function btnTglColour(btn,type) {
		if (tglTypes[`${type}`]) {btn.style.background = '#7d7';} // light green
		else {btn.style.background = '#eaa';} // light red
	}

	function renderBtns() {
		const jhButton = document.querySelector('#jhButton');
		if (jhButton) return;
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

		const filterType = ['Hunts','Marketplace','Mapping','Trading','Convertible','Misc'];
		if (!Object.keys(tglTypes).length) {
			filterType.forEach((type)=>{
				tglTypes[`${type}`] = true;
			});
		}

		for (let i = 0; i < 6; i++) {
			const clone = hoverBtn.cloneNode(true);
			const type = filterType[i];
			let cloneTgl = tglTypes[`${type}`];

			if (cloneTgl) {clone.style.background = '#7d7';} // light green
			else {clone.style.background = '#eaa';} // light red
			clone.id = 'jhButton';
			clone.innerHTML = type;
			clone.style.backgroundImage = 'none';
			clone.style.padding = '0 0 0 5px';
			clone.onclick = (()=>{
				massClasser();
				entryFilterTgl(`${type}`);
				btnTglColour(clone,type);
			})
			hoverDiv.insertBefore(clone,hoverBtn);
		}

		const lastBtn = document.querySelector('.pagerView-lastPageLink.pagerView-link');
		const infiniteBtn = lastBtn.cloneNode(true);
		let infiniteTgl = true;

		infiniteBtn.innerHTML = 'Infinite.';
		infiniteBtn.onclick = (()=>{
			if (infiniteTgl) {
				infiniteTgl = false;
				renderSavedEntries();
				loadTgl();
			}
			else {
				infiniteTgl = true;
				const allEntries = document.querySelectorAll('.entry');
				for (let entry = 12; entry < allEntries.length; entry++) {
					allEntries[entry].remove();
				}
			}
		});
		lastBtn.after(infiniteBtn);
		document.querySelectorAll('.pagerView-link').forEach((el)=>{
			el.style.margin = "0 2px";
			el.style.padding = "3px";
		})
	}
	massClasser(); // needed before loadTgl will work
	saveEntries();
	loadTgl();
	renderBtns();
})();
