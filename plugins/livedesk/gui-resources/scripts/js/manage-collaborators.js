define([
	'jquery',
	'gizmo/superdesk',
	'jquery/rest',
	'jquery/superdesk',
	'jquery/avatar',
	config.guiJs('livedesk', 'models/collaborators'),
	config.guiJs('livedesk', 'models/blog'),
	config.guiJs('livedesk', 'models/collaborator'),
	'tmpl!livedesk>layouts/livedesk',
	'tmpl!livedesk>layouts/blog',
	'tmpl!livedesk>manage-collaborators',
	'tmpl!livedesk>manage-collaborators/internal-collaborator',
	'tmpl!livedesk>manage-collaborators/internal-collaborators',
	'tmpl!livedesk>manage-collaborators/add-internal-collaborator'
	], function ($, Gizmo) {

	/*!
	 * A default view witch can handle the sort process
	 *    the model will be added in the views in a sorted fashion.
	 * Implementes need
	 *   Initialize:
	 *     the _view propertie empty
	 */ 
	var SortedView = Gizmo.View.extend({
		_views: [],
		// default key for sorting the objects
		sortProperty: 'Name',
		sortOne: function(model, view){
			var self = this,
				dir = "after", 
				from,
				count = self._views.length;
			if(!count) {
				self._views = [view];
			} else {
				if( dir == "after") {
					from = self._views[self._views.length-1];
					self._views.push(view);
				} else {
					from = self._views[0];
					self._views.unshift(view);
				}
				/*!
				 * Sort function by getting sortProperty within model from the view
				 * key of the string property to be sorted can be specified in the sortProperty
				 */
				self._views.sort(function(a,b){
					return a.model.get(self.sortProperty).toLowerCase() > b.model.get(self.sortProperty).toLowerCase();
				});
				pos = self._views.indexOf(view);
				if(pos === 0 ) {
					from = self._views[1];
					dir = "before";
				} else if( pos === (self._views.length -1) ) {
					from = self._views[self._views.length - 2];
					dir = "after";
				} else {
					from = self._views[pos-1];
					dir = "after";
				}
				from.el[dir](view.el);
			}
			return view;
		},		
	}),
	CollaboratorView = Gizmo.View.extend({
		events: {
			'a[href="#delete_internal_collaborator"]': { click: 'delete' }
		},
		init: function(){
			this.render();
		},
		render: function(){
			var self = this, data = self.model.feed('json',true);
			this.el.tmpl('livedesk>manage-collaborators/internal-collaborator',data);
		},
		delete: function(){
			var self = this;
			$('#delete_internal_collaborator')
				.find('#delete_collaborator_name').text(self.model.get('Name')).end()
				.find('.btn-primary').on(self.getEvent("click"), function(evt){
					evt.preventDefault();
					self._parent._deletePending.push(self.model);
					self.el.fadeTo(900, '0.1', function(){
						self.el.remove();
					});
					//$("#delete_internal_collaborator").modal('hide');			
				});
		}
	}),
	AddInternalCollaboratorView = Gizmo.View.extend({
		events: {
			'.select-colaborator': { change: 'addInternalCollaborator' }
		},	
		init: function(){
			this.render();
		},
		render: function(){
			var self = this, data = self.model.feed('json',true);
			this.el.tmpl('livedesk>manage-collaborators/add-internal-collaborator',data);
		},
		addInternalCollaborator: function(evt) {
			var self = this;
			if($(evt.target).is(':checked')) {
				self._parent._addPending.push(self.model);
			} else {
				pos = self._parent._addPending.indexOf(self.model);
				if(pos !== -1) {
					self._parent._addPending.splice(pos,1);
				}
			}
		}
	}),
	AddInternalCollaboratorsView = Gizmo.View.extend({
		events: {
			'.save': { click: 'addPendingCollaborators'},
			'[name="internalCollaboratorSelectAll"]': { change: 'toggleCollaborators' },
			'.searchbox': { keyup: 'searchWait' }
		},
		stillTyping: false,

		init: function(){
			var self = this;
			self.collection
				.on('read', self.render, self)
				.on('modified', self.render, self);

		},
		searchWait: function(evt) {
			var self = this, el = $(evt.target);
			clearTimeout($(el).data("typing"));
			$(el).data("typing", setTimeout(function(){
				var val = $(el).val();
				if( $(el).data('previous') !== val )
					self.search(val);
				$(el).data('previous', val);
			}, 200));
		},
		search: function(searchText) {
			var self = this;
			self.collection
				.xfilter('Id,Name,Person.Id,Person.FullName,Person.EMail')
				.limit(self.collection.config("limit"))
				.param('%'+searchText+'%','qp.firstName.ilike')
				.sync();
		},
		refresh: function() {
			var self = this;
			self._addPending = [];
			self.el.find('.searchbox').val('');
			self.collection
				.xfilter('Id,Name,Person.Id,Person.FullName,Person.EMail')
				.limit(self.collection.config("limit"))
				.sync();
		},
		addOne: function(model) {
			if( (model.get('Person')._clientId !== undefined) && (model.get('Person').internalCollaboratorView === undefined) ) {
				var self = this,
					view = new AddInternalCollaboratorView({ model: model, _parent: self});
					self.el.find('.internal-collaborators').append(view.el);
			}
		},
		addAll: function(evt, data) {
			for(var i=0, count = data.length; i<count; i++) {
				this.addOne(data[i]);
			}
		},
		addUpdates: function(evt, data) {

		},
		render: function(evt, data) {
			var self = this;
			if(!data)
				data = self.collection._list;
			self.el.find('.internal-collaborators').html('');
			self.addAll(evt, data);
		},
		addPendingCollaborators: function(evt) {
			var self = this;
			self._parent.addAllNew(evt, self._addPending);
		},
		toggleCollaborators: function(evt) {
			var self = this;
			self.el.find('.internal-collaborators [type="checkbox"]').prop('checked', $(evt.target).is(':checked')).change();
		}
	}),
	ManageInternalCollaboratorsView = SortedView.extend({
		events: {
			'[href="#addCollaborator2"]': { click: 'addInternalCollaborators' }
		},
		init: function(){
			var self = this;
			self.addInternalCollaboratorsView = null;
			self._views = [];
			self._addPending = [];
			self._deletePending = [];
			self.collection
				.on('read', self.render, self)
				.xfilter('Id,Name,Person.Id,Person.FullName,Person.EMail')
				//.limit(self.collection.config("limit"))
				.sync();
		},
		addOne: function(model) {
			var self = this,
				view = new CollaboratorView({ model: model, _parent: self});
			model.get('Person').internalCollaboratorView = view;
			self.el.find('.plain-table').prepend(view.el);
			//self.sortOne(model, view);
		},
		addAllNew: function(evt, data) {
			for(var i=0, count = data.length; i<count; i++) {
				this.addOne(data[i]);
				this._addPending.push(data[i]);
			}
		},
		addAll: function(evt, data) {
			for(var i=0, count = data.length; i<count; i++) {
				this.addOne(data[i]);
			}
		},
		render: function(evt, data) {
			var self = this;
			self.el.tmpl('livedesk>manage-collaborators/internal-collaborators',function(){
				self.addAll(evt, self.collection._list);
			});
		},
		addInternalCollaborators: function(evt) {
			var self = this;
			if(!self.addInternalCollaboratorsView) {
				self.addInternalCollaboratorsView = new AddInternalCollaboratorsView({
					collection: self.collectionPotentialCollaborator,//Gizmo.Auth(new Gizmo.Register.Collaborators()),
					el: $('#addCollaborator2'),
					_parent: self
				});
			}
			self.addInternalCollaboratorsView.refresh();
		},
		save: function(evt) {
			var self = this;
			self.collection.add(self._addPending).done(function(){
				self._addPending = [];
			});
			self.collection.remove(self._deletePending).done(function(){
				self._deletePending = [];
			});
		}
	}),
	MainManageCollaboratorsView = Gizmo.View.extend({
		events: {
			'#save-manage-collaborators': { click: 'save'},
			'#save-and-close-manage-collaborators': { click: 'saveAndClose' }
		},
		refresh: function () {
			var self = this;
			self.model = Gizmo.Auth(new Gizmo.Register.Blog(self.theBlog));
			self.model
				.on('read', self.render, self)
				.sync();
		},
		render: function(evt, data) {
			var self = this,
			data = $.extend({}, this.model.feed(), {
					
					BlogHref: self.theBlog,
					ui:	{

						content: 'is-content=1',
						side: 'is-side=1',
						submenu: 'is-submenu',
						submenuActive1: 'active'
					},
				    isLive: function(chk, ctx){ return ctx.current().LiveOn ? "hide" : ""; },
				    isOffline: function(chk, ctx){ return ctx.current().LiveOn ? "" : "hide"; },
				    isCreatorOrAdmin: (function() {

				        var userId = localStorage.getItem('superdesk.login.id');
				        if( self.model.get('Creator').get('Id') == userId) return true;
				        self.model.get('Admin').each(function() { 
				            if(this.get('Id') == userId) return true;
				        });  
				        return false;
				    })()
			});
			self.manageInternalCollaboratorsView = new ManageInternalCollaboratorsView({
				collection: self.model.get('Collaborator'),
				collectionPotentialCollaborator: self.model.get('CollaboratorPotential')
			});
            data.ui = {
				content: 'is-content=1', 
				side: 'is-side=1', 
				submenu: 'is-submenu', 
				submenuActive3: 'active'	
			};

			$.superdesk.applyLayout('livedesk>manage-collaborators', data, function(){
		       var topSubMenu = $(self.el).find('[is-submenu]');
		        $(topSubMenu)
		        .off(self.getEvent('click'), 'a[data-target="configure-blog"]')
		        .on(self.getEvent('click'), 'a[data-target="configure-blog"]', function(event)
		        {
		            event.preventDefault();
		            var blogHref = $(this).attr('href');
		            $.superdesk.getActions('modules.livedesk.configure')
		            .done(function(action)
		            {
		            	action = (action[0])? action[0] : action;
		                action.ScriptPath &&
		                    require([$.superdesk.apiUrl+action.ScriptPath], function(app){ 
		                    	console.log(app);
		                    	new app(blogHref); });
		            });
		        })
		        .off(self.getEvent('click'), 'a[data-target="manage-collaborators-blog"]')
				.on(self.getEvent('click'), 'a[data-target="manage-collaborators-blog"]', function(event)
				{
					event.preventDefault();
					var blogHref = $(this).attr('href')
					$.superdesk.getAction('modules.livedesk.manage-collaborators')
					.done(function(action)
					{
						action = (action[0])? action[0] : action;
						action.ScriptPath && 
							require([$.superdesk.apiUrl+action.ScriptPath], function(app){ new app(blogHref); });
					});
				})
		        .off(self.getEvent('click'), 'a[data-target="edit-blog"]')
		        .on(self.getEvent('click'), 'a[data-target="edit-blog"]', function(event)
		        {
		            event.preventDefault();
		            var blogHref = $(this).attr('href');
		            $.superdesk.getAction('modules.livedesk.edit')
		            .done(function(action)
		            {
		            	action = (action[0])? action[0] : action;
		                action.ScriptPath && 
							require([$.superdesk.apiUrl+action.ScriptPath], function(EditApp){ EditApp(blogHref); });
		            });
		        });
				self.el.find('.controls').append(self.manageInternalCollaboratorsView.el);
			});
		},
		save: function(evt) {
			evt.preventDefault();
			/*!
			 * Delegate event to each of the subviews
			 * manageInternal and manageExternal
			 */
			this.manageInternalCollaboratorsView.save(evt);
		}
	});
	var mainManageCollaboratosView = new MainManageCollaboratorsView({
		el: '#area-main'
	});
	return app = function (theBlog) {
		mainManageCollaboratosView.theBlog = theBlog;
		mainManageCollaboratosView.refresh();
	}
});