from openai import OpenAI
import json
import pymysql
import sys

conn = pymysql.connect(
    host='localhost',
    user='root',
    password='password',
    db='unsicher',
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor
)

api_key = "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"
client = OpenAI(api_key=api_key)

with open("/home/hawonc/Unsicher/tools/info.json", "r") as file:
  user_info = json.load(file)

responses = []
dateval = user_info['data'].get('date', '')
osval = user_info['data'].get('os', '')
clientval = user_info['data'].get('client', '')
deviceval = user_info['data'].get('device', '')
nationval = user_info['data'].get('nation', '')
regionval = user_info['data'].get('region', '')
secondnationval = user_info['userinput'].get('nation', '')

user_content = (
  f"The nation the user is assumed to be from : {secondnationval}"
  f"Actual information on user( "
  f"date: {dateval}, "
  f"operating system: {osval}, "
  f"client: {clientval}, "
  f"device: {deviceval}, "
  f"nation: {nationval}, "
  f"region: {regionval}, "
)

response = client.chat.completions.create(
  model="gpt-3.5-turbo",
  messages=[
    {
      "role": "system",
      "content": "Is the user suspicious based on the given information? Provide an informative response. Here are some other things to consider: "
                 "The assumption of the nation may or may not be blank, take that into account."
                 "If their client is the tor browser, they are most likely hiding something."
                 "Take into account what information does not match and why they might be lying "
                 "based on context of where they live and other information combined."
                 "Finally, rate the user from 1 to 100. 1 being not suspicious at all and 100 being very suspicious."
                 "Consider the countries reputation when rating. Please write the only the number on the first line and the explanation after it."
    },
    {
      "role": "user",
      "content": user_content
    }
  ],
  temperature=1,
  max_tokens=300,
  top_p=1
)

try:
    with conn.cursor() as cursor:
        a = response.choices[0].message.content
        # Create a new record
        sql = "UPDATE `aiData` SET `rating`=%s, `comment`=%s WHERE id=%s"
        cursor.execute(sql, (a.partition('\n')[0], response.choices[0].message.content, sys.argv[1]))

    # Commit changes
    conn.commit()
finally:
    conn.close()

print("done")
sys.stdout.flush()
