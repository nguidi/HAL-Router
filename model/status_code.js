var	Factory
=	function(
		_
	,	URL
	,	HAL
	)
	{
		return	function(config)
				{

					this.Status_codes
					=	function()
						{
							this.name
							=	'status_codes'

							this.store
							=	new Object()

							var self
							=	this

							this.url
							=	function(code)
								{
									return	URL.format(
													{
														protocol:	config.server.protocol
													,	hostname:	config.server.host
													,	port:		config.server.port
													,	pathname:	config.server.base+'/'+this.name+'/'+code
													}
												)
								}

							_.each(
								config.status_codes
							,	function(status,code)
								{
									_.extend(
										self.store
									,	_.object(
											[code]
										,	[
												new HAL.Resource(
														{
															code:	code
														,	status:	status
														}
													,	self.url(code)
													)
											]
										)
									)
								}
							)

							this.resolve
							=	function(req)
								{
									console.log("Status_code.resolve")
									var	deferred
									=	Q.defer()

									deferred
										.resolve(
											this.store[req.status_code]
										)
									
									return deferred.promise
								}
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelStatusCode']
	=	Factory
else
	module.exports
	=	Factory