var	_
=	require('underscore')
,	Q
=	require('q')
,	Log
=	require('log-color')
,	logger
=	new Log(
		{
			level:	'debug'
		,	color:	true
		}
	)
,	fs
=	require('fs')
,	epath
=	require('path')
,	fsExists
=	fs.existsSync || epath.existsSync
,	nStore
=	require('nstore')
nStore
=	nStore.extend(require('nstore/query')())

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

function Store(config,transforms,mappings)
{
	var	transforms_input
	=	new Object()
	,	sources_data
	=	new	Object()
	,	self
	=	this

	this.sources
	=	new Object()

	this.get_path
	=	function(transform)
		{
			var	transform_path
			=	_.find(
					_.isArray(config.input)
					?	config.input
					:	new Array(config.input)
				,	function(input)
					{
						return	fsExists(
									epath.join(__dirname, input.folder)
									+	'data/json/'
									+	transform.storage.name
									+	'.json'
								)
					}
				)

			return	epath.join(__dirname,transform_path.folder)
				+	'data/json/'
				+	transform.storage.name
				+	'.json'	
		}

	this.generate_data
	=	function()
		{
			_.each(
				transforms
			,	function(transform,name)
				{
					var	path
					=	self.get_path(transform)
					
					if	(_.isUndefined(sources_data[name]))
						sources_data[name]
						=	new Object()
					
					if	(fsExists(path)) {
						var	parent
						=	_.find(
								transform.associations
							,	function(assoc)
								{
									return	_.isEqual(assoc.type,'is-a')
								}
							)
						_.each(
							JSON
								.parse(
									fs.readFileSync(path,'utf8')
								)
						,	function(object,index)
							{
								_.extend(
									sources_data[name]
								,	_.object(
										[object.id]
									,	[object]
									)
								)
								 if	(parent)
								 {
								 	if	(_.isUndefined(sources_data[parent.target]))
								 		sources_data[parent.target]
							 			=	new Object()

							 		_.extend(
							 			sources_data[parent.target]
							 		,	_.object(
											[object.id]
										,	[
												_.extend(
													sources_data[parent.target][object.id]
												||	{}
												,	object
												)
											]
										)
							 		)
								 }
							}
						)
					} else
						logger.warning('Data Input: no such file '+path+'/'+transform.storage.name+'.json')
				}
			)

			return	sources_data
		}

	_.each(
		this.generate_data()
	,	function(data,name)
		{
			fs
				.unlink(
					name+'.db'
				,	function (err) {
						self.sources[name]
						=	nStore
								.new(
									name+'.db'
								,	function()
									{
										// DB Creada
										_.each(
											data
										,	function(object,index)
											{
												self.sources[name]
														.save(
															index
														,	object
														,	function(err)
															{
																if (err)
																	throw err
															}
														)
											}
										)
									}
								)
					}
				)	
		}
	)

	this.show
	=	function(name,id)
		{
			console.log("Store.show")
			var	deferred
			=	Q.defer()

			this.sources[name]
					.get(
						id
					,	function(err, doc, key)
						{
							deferred
								.resolve(
									doc
								)
						}
					)

			return	deferred.promise
		}

	this.list
	=	function(name,query)
		{
			console.log("Store.list")
			var	deferred
			=	Q.defer()
			,	initial
			=	_.isUndefined(query.page) || _.isUndefined(query.ipp)
				?	0
				:	(query.page-1)*query.ipp
			,	final
			=	_.isUndefined(query.page) || _.isUndefined(query.ipp)
				?	0
				:	(query.page-1)*query.ipp+query.ipp

			this.sources[name]
					.all(
						function(err, docs)
						{
							deferred
								.resolve(
									{
										data:	_.between(
													_.values(docs)
												,	initial
												,	final
												)
									,	count:	_.values(docs).length
									}
								)
						}
					)

			return	deferred.promise
		}

	this.filter
	=	function(name,body)
		{
			console.log("Store.filter")
			var	deferred
			=	Q.defer()
			,	initial
			=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
				?	0
				:	body.collection_query.page*body.collection_query.ipp - body.collection_query.ipp
			,	final
			=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
				?	0
				:	body.collection_query.page*body.collection_query.ipp

			this.sources[name]
					.all(
						function(err, docs)
						{
							deferred
								.resolve(
									{
										data:	_.between(
													_.filter(
														_.values(docs)
													,	function(item)
														{
															return	apply_filter(body.query,item)
														}
													)
												,	initial
												,	final
												)
									,	count:	_.values(docs).length
									}
								)
						}
					)

			return	deferred.promise
		}

	this.find
	=	function(name,body)
		{
			console.log("Store.find")
			var	deferred
			=	Q.defer()

			this.sources[name]
					.all(
						function(err, docs)
						{
							deferred
								.resolve(
									_.find(
										_.values(docs)
									,	function(item)
										{
											return	apply_filter(body.query,item)
										}
									)
								)
						}
					)

			return	deferred.promise
		}

	this.find_through
	=	function(name,body)
		{
			console.log("Store.find_through")
			var	deferred
			=	Q.defer()
			,	self
			=	this

			self.sources[body.through.name]
					.all(
						function(err,docs)
						{
							var through_item
							=	_.find(
								_.values(docs)
							,	function(item)
								{
									return	apply_filter({key: body.through.through_key, value: body.through.value},item)
								}
							)

							self.sources[name]
									.all(
										function(err, sdocs)
										{
											deferred
												.resolve(
													_.find(
														_.values(sdocs)
													,	function(item)
														{
															return	apply_filter({key: body.through.through_target_key, value: through_item[body.through.target_key]},item)
														}
													)
												)
										}
									)
						}
					)

			return	deferred.promise
		}

	this.filter_through
	=	function(name,body)
		{
			console.log("Store.filter_through")
			var	deferred
			=	Q.defer()
			,	self
			=	this
			,	initial
			=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
				?	0
				:	body.collection_query.page*body.collection_query.ipp-body.collection_query.ipp
			,	final
			=	_.isUndefined(body.collection_query.page) || _.isUndefined(body.collection_query.ipp)
				?	0
				:	body.collection_query.page*body.collection_query.ipp

			self.sources[body.through.name]
					.all(
						function(err,docs)
						{
							var through
							=	_.filter(
									_.values(docs)
								,	function(item)
									{
										return	apply_filter({key: body.through.through_key, value: body.through.value},item)
									}
								)
							self.sources[name]
									.all(
										function(err, sdocs)
										{
											var collection
											=	_.between(
													_.flatten(
														_.map(
															through
														,	function(through_item)
															{
																return	_.filter(
																			_.values(sdocs)
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

											deferred
												.resolve(
													{
														data:	collection
													,	count:	collection.length
													}
												)
										}
									)
						}
					)

			return	deferred.promise
		}

	this.update
	=	function(name,id,data)
		{
			console.log("Store.update")
			var	deferred
			=	Q.defer()
			,	self
			=	this

			self.sources[name]
					.get(
						id
					,	function(err,doc)
						{
							_.extend(
								doc
							,	data
							)
							self.sources[name]
									.save(
										id
									,	doc
									,	function(err, key)
										{
											deferred
												.resolve(
														doc
													)
										}
									)
						}
					)

			return	deferred.promise
		}

	this.delete
	=	function(name,id)
		{
			console.log("Store.delete")
			var	deferred
			=	Q.defer()

			this.sources[name]
					.remove(
						id
					,	function(err, key)
						{
							if (err)
								deferred
									.resolve(
										{
											code: 404
										}
									)
							else
								deferred
									.resolve(
										{
											code: 200
										}
									)
						}
					)

			return	deferred.promise
		}

	this.create
	=	function(name,data)
		{
			console.log("Store.create")
			var	deferred
			=	Q.defer()
			,	self
			=	this

			self.sources[name]
					.all(
						function(err,docs)
						{
							_.extend(
								data
							,	{
									id:	_.values(docs).length+1
								}
							)
							self.sources[name]
									.save(
										docs.length+1
									,	data
									,	function(err, key)
										{
											deferred
												.resolve(
													data
												)
										}
									)
						}
					)


			return	deferred.promise
		}
}

module.exports
=	{
		'Store': Store
	}