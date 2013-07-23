var	Q
=	require('q')
,	_
=	require('underscore')
	_.str
=	require('underscore.string')

module.exports
=	function(app)
	{
		var	Store
		=	app.get('Store')
		,	Association
		=	require('../lib/association.js')(app)

		return	function(transform_name,transform)
				{
					this.name
					=	transform_name

					this.key
					=	'id'	//	TODO:	Obtener Clave Primaria desde el Mapping

					this.model_template
					=	uritemplate(
							'/{model_name}'
						)

					this.model_id_template
					=	uritemplate(
							'/{model_name}/:{model_key}'
						)

					this.associations
					=	_.map(
							transform.associations
						,	function(assoc,assoc_name)
							{
								return	new	Association(
												assoc_name
											,	{
													name:	transform_name
												,	key:	'id'
												}
											,	assoc
										)
							}
						)

					this.collection
					=	transform.collection
					||	{
							type:	'list'
						,	page:	1
						,	ipp:	10
						}

					this.url
					=	function(data)
						{
							return	_.isUndefined(data)
									?	app.get('base_url')
									+	this.model_template
												.expand(
													{
														model_name:		this.name
													}
												)
									:	app.get('base_url')
									+	this.model_id_template
												.expand(
													{
														model_name:		this.name
													,	model_key:		data[this.key]
													}
												).replace(':','')
						}

					this.get_links
					=	function(data)
						{
							var	links
							=	new Object()

							_.each(
								this.associations
							,	function(assoc)
								{
									links[assoc.name]
									=	assoc.get_link(data)
								}
							)

							return	links
						}

					this.get_curies
					=	function()
						{
							var	curies
							=	new Object()

							_.each(
								this.associations
							,	function(assoc)
								{
									_.extend(
										curies
									,	assoc.get_curies()
									)
								}
							)

							return	curies
						}

					this.get_associations
					=	function(req,data)
						{
							var	self
							=	this

							return	_.filter(
										this.associations
									,	function(assoc)
										{
											return	!self.was_visited(req,data,assoc)
												&&	!_.isEqual(assoc.embedded,'none')
										}
									)
						}

					this.resolve_assoc
					=	function(req,assoc,data)
						{
							var	deferred
							=	Q.defer()
							,	target_model
							=	assoc.get_model()
							,	body
							=	assoc.get_body(data)

							target_model[body.action](body)
							.then(
								function(result)
								{
									app.build[
										_.has(result,'data','count')
										?	'collection'
										:	'resource'
									](req,target_model,result,assoc.collection)
									.then(
										function(hal)
										{
											deferred
												.resolve(
													_.extend(
														hal
													,	{
															name:	assoc.name
														}
													)
												)
										}
									)
								}
							)


							return	deferred.promise
						}

					this.was_visited
					=	function(req,data,assoc)
						{
							var	requested
							=	{
									from:	assoc.source.name
								,	to:		assoc.target
								,	name:	assoc.name
								,	data:	data
								,	type:	assoc.type
								}
							,	found
							=	_.find(
									req.visited
								,	function(visited)
									{
										if	(
												_.isEqual(visited.from,requested.from)
											&&	_.isEqual(visited.to,requested.to)
											&&	_.isEqual(visited.name,requested.name)
											&&	_.isEqual(visited.type,requested.type)
											)	return 	_.isEqual(visited.data,requested.data)
										else
											if	(
													_.isEqual(visited.from,requested.to)
												&&	_.isEqual(visited.to,requested.from)
												)	if	(
														(_.isEqual(requested.type,'belongs-to') && _.str.include(visited.type,'has-'))
														||	(_.str.include(requested.type,'has-') && _.isEqual(visited.type,'belongs-to'))
														)	return	_.isEqual(visited.data,requested.data)
											else
												return	false
									}
								)
							if	(_.isUndefined(found))
								req.visited.push(requested)
							return	!_.isUndefined(found)
						}

					this.findOne
					=	function(id,query)
						{
							var	deferred
							=	Q.defer()

							Store
								.show(
									this.name
								,	id
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.findOneBy
					=	function(body)
						{
							var	deferred
							=	Q.defer()

							Store
								.find(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.findOneThrough
					=	function(body)
						{
							var	deferred
							=	Q.defer()

							Store
								.find_through(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.findAll
					=	function(collection_query)
						{
							var	deferred
							=	Q.defer()

							Store
								.list(
									this.name
								,	collection_query
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.findAllBy
					=	function(body)
						{
							var	deferred
							=	Q.defer()

							Store
								.filter(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.findAllThrough
					=	function(body)
						{
							var	deferred
							=	Q.defer()

							Store
								.filter_through(
									this.name
								,	body
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.update
					=	function(id,data)
						{
							var	deferred
							=	Q.defer()

							Store
								.update(
									this.name
								,	id
								,	data
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
					
					this.create
					=	function(data)
						{
							var	deferred
							=	Q.defer()

							Store
								.create(
									this.name
								,	data
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}

					this.delete
					=	function(id)
						{
							var	deferred
							=	Q.defer()

							Store
								.delete(
									this.name
								,	id
								).then(
									function(data)
									{
										deferred
											.resolve(
												data
											)
									}
								)

							return	deferred.promise
						}
				}
	}