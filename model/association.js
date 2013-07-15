var	Factory
=	function(
		_
	,	URL
	,	Q
	,	Curies
	,	ACL
	,	uritemplate
	)
	{
		return	function(config,transforms)
				{			

					this.Association	
					=	function(spec_key,assoc,assoc_key)
						{
							var	self
							=	this
							,	embeded_defaults
							=	{
									type: "none"
								}

							this.source
							=	spec_key

							this.name
							=	assoc_key
							
							this.type
							=	assoc.type

							this.target
							=	assoc.target

							this.template
							=	assoc.template
							||	'/{assoc_source}/{id}/{assoc_name}'

							this.target_key
							=	assoc.target_key
							||	'id'

							this.attrs
							=	assoc.attrs

							this.key
							=	assoc.key
							||	'id'

							if	(_.isEqual(assoc.type,"has-and-belongs-to-many"))
							{
								this.through
								=	assoc.through

								this.key
								=	'id'

								this.target_key
								=	'id'

								this.through_key
								=	_.find(
										transforms[assoc.target].associations
									,	function(through_assoc)
										{
											return	through_assoc.target == self.source
										}
									).target_key

								this.through_target_key
								=	assoc.target_key
							}	else
								if	(_.isDefined(assoc.through))
								{
									this.through
									=	assoc.through

									this.through_key
									=	assoc.through_key
									||	_.find(
											transforms[assoc.through].associations
										,	function(through_assoc)
											{
												return	through_assoc.target == self.source
											}
										)['key']

									this.through_target_key
									=	assoc.through_target_key
									||	_.find(
											transforms[assoc.target].associations
										,	function(through_assoc)
											{
												return	through_assoc.target == assoc.through
											}
										)[
											_.str.include(this.type,'has-many')
											?	'target_key'
											:	'key'
										]
								}

							this.link
							=	assoc.link

							this.embedded
							=	_.isString(assoc.embedded)
								?	{type: assoc.embedded}
								:	_.extend(
										embeded_defaults
									,	assoc.embedded
									)


							this.generate_links
							=	function(data,profile)
								{
									console.log("Assoc.generate_link")
									var	self
									=	this
									,	href
									=	this.generate_url(data)
									,	attrs
									=	this.attrs
									,	name
									=	this.name
									,	target
									=	this.target
									||	data[attrs.assoc]
									,	source
									=	_.isDefined(target) && !_.isNull(target)
										?	this.source
										:	data[attrs.target]
									,	curies
									=	Curies.get(this.type)
									,	links
									=	{
											curies: curies
										}

									_.each(
										curies
									,	function(curie)
										{
											ACL
												.query(
													profile
												,	_.isDefined(target) && !_.isNull(target)
													?	source+':'+target
													:	source
												,	_.contains(['show','list','find','filter'],curie.name)
													?	'view'
													:	curie.name
												,	function(err, allowed)
													{
														console.log(
															profile
														,	_.isDefined(target) && !_.isNull(target)
															?	source+':'+target
															:	source
														,	_.contains(['show','list','find','filter'],curie.name)
															?	'view'
															:	curie.name
														,	allowed
														)
														var	renamed
														=	(
																_.isDefined(attrs)
																?	uritemplate(
																		name
																	).expand(
																		_.extend(
																			self.pick_attrs(data)
																		)
																	)
																:	name
															).toLowerCase()
														if	(allowed)
															_.extend(
																links
															,	_.object(
																	[
																		curie.name+':'+renamed
																	]
																,	[
																		{
																			name:	_.str.strRightBack(renamed,':')
																		,	href:	href
																		}
																	]
																)
															)
													}
												)
										}
									)

									return	links
								}

							this.get_query_key
							=	function()
								{
									return	_.str.include(this.type,'has')
											?	this.key
											:	this.target_key
								}

							this.get_action
							=	function()
								{
									return	_.str.include(this.type,'has-many') || _.isEqual(this.type,'has-and-belongs-to-many')
											?	'filter'
											:	'find'
								}

							this.get_query
							=	function(data)
								{
									return	[
												_.str.include(this.type,'through') || _.isEqual(this.type,'has-and-belongs-to-many')
												?	{}
												:	{
														key:	this.target_key
													,	value:	data[
																	_.str.include(this.type,'has-')
																	?	this.key
																	:	this.target_key
																]
													}
											]
								}

							this.get_through
							=	function(data)
								{
									return	_.isDefined(this.through)
											?	{
													name:		this.through
												,	target_key:		this.target_key
												,	through_key:	this.through_key
												,	value:	data[this.key]
												,	through_target_key:	this.through_target_key
												}
											:	undefined
								}

							this.generate_body
							=	function(data)
								{
									console.log("Assoc.generate_body")
									return	{
												action:		this.get_action()
											,	query:		this.get_query(data)
											,	through:	this.get_through(data)
											}
								}

							this.pick_attrs
							=	function(data)
								{
									var attrs
									=	this.attrs
									,	obj
									=	new Object()

									if	(_.isDefined(attrs))
									{
										_.each(
											_.keys(attrs)
										,	function(key,i)
											{
												obj[key] = data[attrs[key]]
											}
										)
									}
									return	obj	
								}


							this.generate_url
							=	function(data)
								{	
									return	uritemplate(
												this.template
											).expand(
												_.extend(
													{
														assoc_source:	this.source
													,	assoc_name:		this.name
													}
												,	data
												,	this.pick_attrs(data)
												)
											)
								}

							this.url
							=	function(data)
								{
									return	URL.format(
													{
														protocol:	config.server.protocol
													,	hostname:	config.server.host
													,	port:		config.server.port
													,	pathname:	this.generate_url(data)
													}
												)
								}

							this.create_request
							=	function(req,data)
								{
									return	_.extend(
												req
											,	{
													method:	'POST'
												,	url:	this.generate_url(data)
												,	body:	this.generate_body(data)
												}
											)
								}
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelAssociation']
	=	Factory
else
	module.exports
	=	Factory
