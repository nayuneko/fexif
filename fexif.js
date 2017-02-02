var FExif = FExif || {};
(function(FExif){
	'use strict';
	const FLICKRAPI_BASEURL = 'https://api.flickr.com/services/rest/';
	const FLICKRAPI_APPKEY = 'bd507f67af32e0216a949b98054c74cd';
	const PROCESSED_CLASS = 'exif';
	const Flickr = function() {
		this._buildQuery = function(params) {
			let queries = [];
			Object.keys(params).forEach(function(key){
				queries.push(key+'='+params[key]);
			});
			if (queries.length == 0) {
				return '';
			}
			return ('&'+queries.join('&'));
		};
		this._fetch = function(method, params) {
			let url = FLICKRAPI_BASEURL+'?method='+method+'&api_key='+FLICKRAPI_APPKEY+'&format=json&nojsoncallback=1';
			url += this._buildQuery(params);
			return fetch(url)
			.then(function(data){
				if (!data.ok || data.status != 200) {
					return Promise.reject();
				}
				return data.json();
			})
			.then(function(json){
				if (json.stat == 'ok') {
					return json;
				}
				let err = 'Flickr fetch error: stat='+json.stat;
				if (json.message) err += ' ['+json.message+']';
				return Promise.reject(err);
			});
		};
		this.getExif = function(photo_id) {
			return this._fetch('flickr.photos.getExif', {photo_id: photo_id})
			.then(function(json){
				let exif = {};
				exif.Camera = json.photo.camera;
				json.photo.exif.forEach(function(e){
					if (!e.tag || !e.raw || !e.raw._content) return true;
					exif[e.tag] = e.raw._content;
				});
				return exif;
			});
		}
	};
	function replaceExif(el) {
		let ifr = el.contentWindow.document;
		let exif_div = ifr.querySelector('div.license');
		if (!exif_div) return;
		let img = ifr.getElementsByTagName('img');
		if (img.length == 0) return;
		let mc = img[0].src.match(/.+\/([^_]+)_.+$/);
		if (!mc || mc.length == 0) return;
		let flickr = new Flickr();
		flickr.getExif(mc[1])
		.then(function(exif){
			let s_speed = exif.ExposureTime;
			if (s_speed.indexOf('/') == -1){
				s_speed += 'sec';
			}
			return exif.Camera+', '+exif.LensModel+', ISO'+exif.ISO+' '+exif.FocalLength+' f/'+exif.FNumber+' '+s_speed;
		})
		.then(function(exif_text){
			exif_div.textContent = exif_text;
			exif_div.classList.add('exif-info');
			exif_div.style.fontStyle = 'italic';
			el.classList.add(PROCESSED_CLASS);
		});
	}
	// initial
	if (!FExif.loaded) {
		FExif.loaded = true;
		let mo = new MutationObserver(function(records){
			records.forEach(function(record){
				for(let i = 0; i < record.addedNodes.length; i++){
					let el = record.addedNodes[i];
					if (!el.tagName || el.tagName.toUpperCase() != 'IFRAME'){
						continue;
					}
					let cl = el.classList;
					if (!cl.contains('flickr-embed-frame') || cl.contains(PROCESSED_CLASS)){
						continue;
					}
					replaceExif(el);
				}
			});
		});
		mo.observe(document.body, {childList: true, subtree: true});
		// 既に構築済みのを拾う
		let ifrs = document.querySelectorAll('iframe.flickr-embed-frame');
		for(let i = 0; i < ifrs.length; i++){
			if (ifrs[i].contains(PROCESSED_CLASS)){
				continue;
			}
			replaceExif(ifrs[i]);
		}
	}
})(FExif);
