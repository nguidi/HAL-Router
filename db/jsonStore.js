var	fs
=	require('fs')
,	fsExists
=	fs.existsSync || path.existsSync
var	Factory
=	function(
		_
	,	Q
	,	logger
	)
	{
	_.between
	=	function(array,initial,final)
		{
			return	_.filter(
						array
					,	function(elem,index)
						{
							return	((initial == final) && final == 0)
									?	true
									:	(final == 0)
										?	index >= initial
										:	index >= initial && final <= index
						}
					)
		}

	var	apply_filter
	=	function(filters,item)
		{
			var bool = new Array()
			_.each(
				filters
			,	function(filter)
				{
					if (_.isUndefined(filter.criteria) || filter.criteria == '=')
						bool.push(item[filter.key] == filter.value)
					else
					if (filter.criteria == '>')
						bool.push(parseFloat(item[filter.key]) > parseFloat(filter.value))
					else
					if (filter.criteria == '>=')
						bool.push(parseFloat(item[filter.key]) >= parseFloat(filter.value))
					else
					if (filter.criteria == '<')
						bool.push(parseFloat(item[filter.key]) < parseFloat(filter.value))
					else
					if (filter.criteria == '<=')
						bool.push(parseFloat(item[filter.key]) <= parseFloat(filter.value))
					else
					if (filter.criteria == '%')
						bool.push(item[filter.key].indexOf(filter.value) != -1)
					else
						bool.push(false)
				}
			)
			return	_.isEmpty(
						_.without(bool,true)
					)
		}

	return	function(config,transforms,mappings)
		{
			var	transforms_input
			=	new Object()
			,	self
			=	this

			this.sources
			=	new Object()
			
			_.each(
				transforms
			,	function(transform,name)
				{
					var	path
					=	config.server.input.folder
						+	'data/json/'
						+	transform.storage.name
						+	'.json'

					if (fsExists(path))
						_.extend(
							self.sources
						,	_.object(
								[name]
							,	[
									JSON
										.parse(
											fs.readFileSync(path,'utf8')
										)
								]
							)
						)
					else
						logger.warning('Data Input: no such file '+found_path+'/'+transform.storage.name+'.json')
				}
			)

			this.show
			=	function(name,id)
				{
					console.log("Store.show")
					return	Q(
								_.find(
									this.sources[name]
								,	function(source)
									{
										return	source.id == id
									}
								)
							)
				}

			this.list
			=	function(name,query)
				{
					console.log("Store.list")
					var initial
					=	_.isUndefined(query.page) || _.isUndefined(query.ipp)
						?	0
						:	query.page*query.ipp
					,	final
					=	_.isUndefined(query.page) || _.isUndefined(query.ipp)
						?	0
						:	query.page*query.ipp+query.ipp
					
					return	Q(
								_.between(
									this.sources[name]
								,	initial
								,	final
								)
							)
				}

			this.filter
			=	function(name,body)
				{
					console.log("Store.filter")
					var initial
					=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
						?	0
						:	body.collection_query.page*body.collection_query.ipp
					,	final
					=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
						?	0
						:	body.collection_query.page*body.collection_query.ipp+body.collection_query.ipp

					return	Q(
								_.between(
									_.filter(
										this.sources[name]
									,	function(item)
										{
											return	apply_filter(body.query,item)
										}
									)
								,	initial
								,	final
								)
							)
				}

			this.find
			=	function(name,body)
				{
					console.log("Store.find")
					return	Q(
								_.find(
									this.sources[name]
								,	function(item)
									{
										return	apply_filter(body.query,item)
									}
								)
							)
				}

			this.update
			=	function(name,id,data)
				{
					return	"UPDATE"
				}

			this.delete
			=	function(name,id)
				{
					return	"DELETE"
				}

			this.create
			=	function(name,data)
				{
					return	"CREATE"
				}
		}
	}
if(
	typeof module === 'undefined'
)
	this['Store']
	=	Factory
else
	module.exports
	=	Factory
