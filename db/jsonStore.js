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
			return	((initial == final) && final == 0)
					?	array
					:	_.filter(
							array
						,	function(elem,index)
							{
								return	(final == 0)
										?	index >= initial
										:	index >= initial && index < final
							}
						)
		}

	var	apply_filter
	=	function(filters,item)
		{
			var bool = new Array()
			_.each(
				_.flatten(
					new Array(filters)
				)
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
						logger.warning('Data Input: no such file '+path+'/'+transform.storage.name+'.json')
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
						:	(query.page-1)*query.ipp
					,	final
					=	_.isUndefined(query.page) || _.isUndefined(query.ipp)
						?	0
						:	(query.page-1)*query.ipp+query.ipp

					return	Q(
								{
									data:	_.between(
												this.sources[name]
											,	initial
											,	final
											)
								,	count:	this.sources[name].length
								}
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
					,	filtered
					=	_.between(
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

					return	Q(
								{
									data:	filtered
								,	count:	filtered.length
								}
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

			this.find_through
			=	function(name,body)
				{
					console.log("Store.find_through")
					var through_item
					=	_.find(
							this.sources[body.through.name]
						,	function(item)
							{
								return	apply_filter({key: body.through.through_key, value: body.through.value},item)
							}
						)

					return	Q(
								_.find(
									this.sources[name]
								,	function(item)
									{
										return	apply_filter({key: body.through.through_target_key, value: through_item[body.through.target_key]},item)
									}
								)
							)
				}

			this.filter_through
			=	function(name,body)
				{
					console.log("Store.filter_through")
					var self
					=	this
					,	initial
					=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
						?	0
						:	body.collection_query.page*body.collection_query.ipp
					,	final
					=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
						?	0
						:	body.collection_query.page*body.collection_query.ipp+body.collection_query.ipp
					,	through
					=	_.filter(
							this.sources[body.through.name]
						,	function(item)
							{
								return	apply_filter({key: body.through.through_key, value: body.through.value},item)
							}
						)

					var collection
					=	_.between(
							_.flatten(
								_.map(
									through
								,	function(through_item)
									{
										return	_.filter(
													self.sources[name]
												,	function(item)
													{
														return	apply_filter({key: body.through.target_key, value: through_item[body.through.through_target_key]},item)
													}
												)
									}
								)
							)
						,	initial
						,	final
						)

					return	Q(
								{
									data:	collection
								,	count:	collection.length
								}
							)
				}

			this.update
			=	function(name,id,data)
				{
					console.log("Store.update")
					return	Q(
								_.extend(
									_.find(
										this.sources[name]
									,	function(item)
										{
											return	_.isEqual(item.id,id)
										}
									)
								, data
								)	
							)
				}

			this.delete
			=	function(name,id)
				{
					console.log("Store.delete")
					var	length
					=	this.sources[name].length
					this.sources[name]
					=	_.filter(
							this.sources[name]
						,	function(item)
							{
								return	!_.isEqual(item.id,id)
							}
						)
					if (!_.isEqual(length,this.sources[name].length))
					{
						delete	found
						status
						=	{
								code: 200
							}
					}	else
						status
						=	{
								code: 404
							}

					return	Q(
								status
							)
				}

			this.create
			=	function(name,data)
				{
					console.log("Store.create")

					var last
					=	_.last(this.sources[name])

					_.extend(
						data
					,	{
							id: parseInt(last.id) + 1
						}
					)

					this.sources[name].push(data)

					return	Q(
								data
							)
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
