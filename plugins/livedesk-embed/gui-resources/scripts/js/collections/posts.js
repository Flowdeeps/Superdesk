define([
	'gizmo/superdesk',
	'livedesk-embed/collections/autocollection',
	'livedesk-embed/models/post'
], function(Gizmo) {
	return Gizmo.Register.AutoCollection.extend({
		parse: function(data){
			if(data.total !== undefined) {
				data.total = parseInt(data.total);
				this.listTotal = data.total;
				delete data.total;
			}
			if(data.PostList)
				return data.PostList;
			return data;
		},
       isCollectionDeleted: function(model)
        {
           console.log(model.get('IsPublished'));
           return model.get('IsPublished') === 'True'? true : false;
        },
		model: Gizmo.Register.Post
	},{ register: 'Posts' });
});