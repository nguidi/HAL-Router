var	Factory
=	function(
		_
	,	URL
	,	Q
	,	Curies
	,	ACL
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

							this.target_key
							=	assoc.target_key
							||	'id'

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
									=	_.find(
											transforms[assoc.through].associations
										,	function(through_assoc)
											{
												return	through_assoc.target == self.source
											}
										)['key']

									this.through_target_key
									=	_.find(
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
									var	href
									=	'/'+this.source+'/'+data.id+'/'+this.name
									,	name
									=	this.name
									,	source
									=	this.source
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
												,	source
												,	_.contains(['show','list'],curie.name)
													?	'view'
													:	curie.name
												,	function(err, allowed)
													{
														if	(allowed)
															_.extend(
																links
															,	_.object(
																	[curie.name+':'+name]
																,	[
																		{
																			name:	name
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

							this.generate_query
							=	function(data)
								{
									return	{
												action:	_.str.include(this.type,'has-many') || _.isEqual(this.type,'has-and-belongs-to-many')
														?	'filter'
														:	'find'
											,	query:
												[
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
											,	through:	_.isDefined(this.through)
															?	{
																	name:		this.through
																,	target_key:		this.target_key
																,	through_key:	this.through_key
																,	value:	data[this.key]
																,	through_target_key:	this.through_target_key
																}
															:	undefined
											}
								}

							this.create_request
							=	function(req,data)
								{
									return	_.extend(
												req
											,	{
													method:	'POST'
												,	url:	'/'+this.source+'/'+data.id+'/'+this.name
												,	body:	this.generate_query(data)
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
