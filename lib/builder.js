var	Factory
=	function(
		_
	,	URL
	,	Q
	,	Store
	,	ACL
	,	Models
	)
	{
		return	function(config)
				{
					var	Status_codes
					=	new Models.Status_codes()

					this.resolve
					=	function(req)
						{
							console.log("Builder.resolve(FULL)")
							var deferred
							=	Q.defer()
							,	parsed
							=	this.parse_url(req)
							,	self
							=	this

							if	(_.isDefined(parsed.subcollection))
								parsed
								=	this.parse_url(
											Models.Resources[_.str.capitalize(parsed.collection)]
												.assoc_method(
													req
												,	parsed.subcollection
												,	{
														id:	parsed.id
													}
												)
										)

							var	method
							=	_.isEqual(parsed.method,'GET') || _.isUndefined(parsed.method)
								?	_.isDefined(parsed.id)
										?	'show'
										:	'list'
								:	_.isEqual(parsed.method,'PUT')
									?	'update'
									: 	_.isEqual(parsed.method,'DELETE')
										?	'delete'
										:	parsed.body.action

							ACL
								.query(
									req.session.profile
								,	parsed.collection
								,	_.contains(['show','list'],method)
									?	'view'
									:	method
								,	function(err, allowed)
									{
										if	(allowed)	{
											deferred
												.resolve(
													_.isObject(method)
													?	self[method.body.action](req,parsed)
													:	_.isUndefined(self[method])
														?	Status_codes
																.resolve(
																	_.extend(
																		req
																	,	{
																			status_code: 405
																		}
																	)
																)
														:	self[method](req,parsed)
												)
										} else {
											deferred
												.resolve(
													Status_codes
														.resolve(
															_.extend(
																req
															,	{
																	status_code: 403
																}
															)
														)
												)
										}
									}
								)

							return	deferred.promise
						}

					//	Parse a request url
					this.parse_url
					=	function(req)
						{
							var parsed_url
							=	URL.parse(req.url).pathname
							,	url
							=	URL.parse(parsed_url.match(RegExp('^'+config.server.base+'(.*)$'))[1]).pathname
							,	splited
							=	url.split('/')
							,	collection_query
							=	_.extend(
									_.object(
										['type','ipp','page']
									,	['list',0,1]
									)
								,	_.pick(
										_.isEqual(req.method,'POST')
										?	req.body.collection_query
										||	{}
										:	URL.parse(req.url,true).query
									,	['type','ipp','page']
									)
								)
							_.each(
								['ipp','page']
							,	function(val)
								{
									collection_query[val]
									=	parseInt(collection_query[val])
								}
							)
							return	{
										method:			req.method
									,	url:			req.url
									,	data_url:		url
									,	collection:		splited[1]
									,	id:				splited[2]
									,	subcollection:	splited[3]
									,	body:			_.extend(
															req.body
														,	{
															collection_query: collection_query
															}
														)
									,	query:			collection_query
									}
						}

					//	Search a resource in the Store (DB).
					this.show
					=	function(req,parsed,partial)
						{
							console.log("Resource.show")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							partial
							=	partial
							||	false
							
							Store
								.show(parsed.collection,parsed.id)
								.then(
									function(raw_data)
									{
										console.log("Resource.raw_data")
										Models.Resources[_.str.capitalize(parsed.collection)]
											.build_resource(req,raw_data,partial)
											.then(
												function(hal_resource)
												{
													console.log("Resource.hal_resource")
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return deferred.promise
						}

					//	Search a set of resources from the Store (DB)
					this.list
					=	function(req,parsed,partial)
						{
							console.log("Resource.list")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							
							partial
							=	partial
							||	false

							Store
								.list(parsed.collection,parsed.query)
								.then(
									function(raw_data)
									{
										console.log("Collection.raw_data")
										Models.Resources[_.str.capitalize(parsed.collection)]
											.build_collection(req,parsed,raw_data,partial)
											.then(
												function(hal_collection)
												{
													console.log("Collection.hal_collection")
													_.extend(
														hal_collection
													,	{
															name: self.name
														}
													)
													deferred
														.resolve(
															hal_collection
														)
												}
											)
									}
								)

							return deferred.promise
						}

					//	Ask the Store (DB) to filter the resource collection given a set of data and add the resources obteined in the local store. If a resource exists in the local store it will be updated.
					this.filter
					=	function(req,parsed,partial)
						{
							console.log("Resource.filter")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							,	store_func
							=	_.isDefined(parsed.body.through)
								?	'filter_through'
								:	'filter'
							
							partial
							=	partial
							||	false

							Store[store_func](parsed.collection,parsed.body)
								.then(
									function(raw_data)
									{
										console.log("Collection.raw_data")
										Models.Resources[_.str.capitalize(parsed.collection)]
											.build_collection(req,parsed,raw_data,partial)
											.then(
												function(hal_collection)
												{
													console.log("Collection.hal_collection")
													_.extend(
														hal_collection
													,	{
															name: self.name
														}
													)
													deferred
														.resolve(
															hal_collection
														)
												}
											)
									}
								)

							return deferred.promise
						}
					
					this.find
					=	function(req,parsed,partial)
						{
							console.log("Resource.find")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							,	store_func
							=	parsed.body.through
								?	'find_through'
								:	'find'
							
							partial
							=	partial
							||	false

							Store
								Store[store_func](parsed.collection,parsed.body)
								.then(
									function(raw_data)
									{
										console.log("Resource.raw_data")
										Models.Resources[_.str.capitalize(parsed.collection)]
											.build_resource(req,raw_data,partial)
											.then(
												function(hal_resource)
												{
													console.log("Resource.hal_resource")
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return deferred.promise
						}

					//	Ask the Store (DB) to update the given resource and if it exists in the local store it will be updated as well.
					this.update
					=	function(req,parsed)
						{
							console.log("Resource.update")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Store
								.update(parsed.collection,parsed.id,_.omit(parsed.body,["query","collection_query"]))
								.then(
									function(raw_data)
									{
										Models.Resources[_.str.capitalize(parsed.collection)]
											.build_resource(req,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return	deferred.promise
						}

					//	Ask the Store (DB) to delete the given resource and if it exists in the local store it will be deleted as well.
					this.delete
					=	function(req,parsed)
						{
							console.log("Resource.delete")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Store
								.delete(parsed.collection,parsed.id)
								.then(
									function(raw_data)
									{
										Models.Resources[_.str.capitalize(parsed.collection)]
											.delete_resource(req,parsed.id,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return	deferred.promise
						}

					//	Ask the Store (DB) to create a given resource and if will created in the local store as well.
					this.create
					=	function(req,parsed)
						{
							console.log("Resource.create")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Store
								.create(parsed.collection,parsed.body.query)
								.then(
									function(raw_data)
									{
										Models.Resources[_.str.capitalize(parsed.collection)]
											.build_resource(req,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return	deferred.promise
						}

					//	Ask the Store (DB) to join the given resource using a set of data.
					this.join
					=	function(req,parsed)
						{
							return	Store.find(parsed.collection,parsed.id)
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['Builder']
	=	Factory
else
	module.exports
	=	Factory
